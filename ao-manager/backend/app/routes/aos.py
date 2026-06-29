import os
import shutil
import zipfile
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import AppelOffre, Concurrent
from ..schemas import AOCreate, AOUpdate, AOOut
from ..config import settings
from ..services import ai_service
from ..services.ocr_service import extract_text

router = APIRouter(prefix="/aos", tags=["Appels d'Offres"])


@router.get("/", response_model=List[AOOut])
def list_aos(
    statut: Optional[str] = None,
    decision: Optional[str] = None,
    domaine: Optional[str] = None,
    q: Optional[str] = None,
    societe_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AppelOffre)
    if statut:
        query = query.filter(AppelOffre.statut == statut)
    if decision:
        query = query.filter(AppelOffre.decision == decision)
    if domaine:
        query = query.filter(AppelOffre.domaine == domaine)
    if q:
        query = query.filter(
            or_(AppelOffre.objet.ilike(f"%{q}%"),
                AppelOffre.reference.ilike(f"%{q}%"))
        )
    if societe_id:
        query = query.filter(AppelOffre.societe_soumissionnaire_id == societe_id)
    return query.order_by(AppelOffre.created_at.desc()).all()


@router.post("/", response_model=AOOut, status_code=201)
def create_ao(data: AOCreate, db: Session = Depends(get_db)):
    ao = AppelOffre(**data.model_dump())
    db.add(ao)
    db.commit()
    db.refresh(ao)
    return ao


@router.get("/{ao_id}", response_model=AOOut)
def get_ao(ao_id: int, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404, "AO non trouvé")
    return ao


@router.put("/{ao_id}", response_model=AOOut)
def update_ao(ao_id: int, data: AOUpdate, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404, "AO non trouvé")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ao, k, v)
    db.commit()
    db.refresh(ao)
    return ao


@router.delete("/{ao_id}", status_code=204)
def delete_ao(ao_id: int, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404, "AO non trouvé")
    db.delete(ao)
    db.commit()


@router.post("/upload-analyse")
async def upload_and_analyse_dao(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload DAO files and run AI analysis. Returns extracted structured data."""
    upload_dir = os.path.join(settings.UPLOAD_DIR, "dao", "tmp")
    Path(upload_dir).mkdir(parents=True, exist_ok=True)

    saved_files = []
    all_text_parts = []

    for file in files:
        dest = os.path.join(upload_dir, file.filename)
        with open(dest, "wb") as f:
            content = await file.read()
            f.write(content)
        saved_files.append(dest)

        ext = Path(file.filename).suffix.lower()
        if ext == ".zip":
            zip_dir = dest + "_extracted"
            os.makedirs(zip_dir, exist_ok=True)
            with zipfile.ZipFile(dest, "r") as zf:
                zf.extractall(zip_dir)
            for root, _, fs in os.walk(zip_dir):
                for fname in fs:
                    fpath = os.path.join(root, fname)
                    saved_files.append(fpath)
                    text = extract_text(fpath)
                    if text:
                        all_text_parts.append(f"=== {fname} ===\n{text}")
        else:
            text = extract_text(dest)
            if text:
                all_text_parts.append(f"=== {file.filename} ===\n{text}")

    if not all_text_parts:
        # Fallback: Claude Vision for scanned PDFs
        from ..services.ocr_service import pdf_to_images_base64
        all_images = []
        for fp in saved_files:
            if fp.lower().endswith(".pdf"):
                imgs = pdf_to_images_base64(fp)
                all_images.extend(imgs)
                if all_images:
                    break  # one PDF is enough for first attempt

        if not all_images:
            return {"error": "Impossible d'extraire le texte des fichiers fournis. Assurez-vous d'uploader un PDF ou DOCX lisible.", "extracted_data": None}

        try:
            extracted = ai_service.analyse_dao_images(all_images)
            warnings = _generate_warnings(extracted)
            return {"extracted_data": extracted, "saved_files": saved_files, "warnings": warnings}
        except Exception as e:
            return {"error": f"Erreur analyse Vision IA : {e}", "extracted_data": None}

    combined_text = "\n\n".join(all_text_parts)
    try:
        extracted = ai_service.analyse_dao(combined_text)
    except Exception as e:
        return {"error": str(e), "extracted_data": None, "raw_text_preview": combined_text[:500]}

    warnings = _generate_warnings(extracted)

    return {
        "extracted_data": extracted,
        "saved_files": saved_files,
        "warnings": warnings
    }


@router.post("/save-from-analyse", response_model=AOOut)
def save_ao_from_analyse(
    data: dict,
    db: Session = Depends(get_db)
):
    """Save an AO from AI analysis result. Upserts by reference."""
    from datetime import datetime
    from sqlalchemy.exc import IntegrityError

    extracted = data.get("extracted_data", {})
    dao_files = data.get("saved_files", [])

    date_limite = None
    if extracted.get("date_limite"):
        try:
            date_limite = datetime.fromisoformat(extracted["date_limite"].replace(" ", "T"))
        except Exception:
            pass

    fields = dict(
        reference=extracted.get("reference"),
        objet=extracted.get("objet"),
        maitre_ouvrage=extracted.get("maitre_ouvrage"),
        date_limite=date_limite,
        procedure=extracted.get("procedure"),
        domaine=extracted.get("domaine"),
        reserve_tpme=bool(extracted.get("reserve_tpme", False)),
        estimation=extracted.get("estimation"),
        lots=extracted.get("lots"),
        caution_provisoire=extracted.get("caution_provisoire"),
        delai_execution=extracted.get("delai_execution"),
        delai_garantie=extracted.get("delai_garantie"),
        lieu_realisation=extracted.get("lieu_realisation"),
        marque_specifique=extracted.get("marque_specifique"),
        prospectus_exige=bool(extracted.get("prospectus_exige", False)),
        echantillon_exige=bool(extracted.get("echantillon_exige", False)),
        tete_de_serie=bool(extracted.get("tete_de_serie", False)),
        structure_offre=extracted.get("structure_offre"),
        notation_technique=extracted.get("notation_technique"),
        offre_technique_exigee=bool(extracted.get("offre_technique_exigee", False)),
        criteres_notation=extracted.get("criteres_notation"),
        fichiers_dao=dao_files or [],
        url_portail=extracted.get("url_portail"),
        statut="en_instance",
    )

    # Upsert: if reference already exists update it, otherwise create
    ref = fields["reference"]
    existing = db.query(AppelOffre).filter(AppelOffre.reference == ref).first() if ref else None
    if existing:
        for k, v in fields.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    ao = AppelOffre(**fields)
    try:
        db.add(ao)
        db.commit()
        db.refresh(ao)
        return ao
    except IntegrityError:
        db.rollback()
        existing = db.query(AppelOffre).filter(AppelOffre.reference == ref).first()
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(500, "Erreur lors de la sauvegarde de l'AO")


@router.put("/{ao_id}/decision")
def set_decision(ao_id: int, body: dict, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404)
    ao.decision = body.get("decision")
    ao.notes = body.get("motif", ao.notes)
    if body.get("decision") == "oui":
        ao.statut = "en_cours_de_reponse"
    elif body.get("decision") == "non":
        ao.statut = "annule"
    db.commit()
    return {"status": "ok", "decision": ao.decision, "statut": ao.statut}


@router.put("/{ao_id}/statut")
def update_statut(ao_id: int, body: dict, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404)
    ao.statut = body.get("statut", ao.statut)
    db.commit()
    return {"status": "ok", "statut": ao.statut}


@router.post("/{ao_id}/concurrents")
def add_concurrent(ao_id: int, body: dict, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404)
    c = Concurrent(ao_id=ao_id, **{k: v for k, v in body.items() if k != "ao_id"})
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id}


@router.get("/{ao_id}/concurrents")
def list_concurrents(ao_id: int, db: Session = Depends(get_db)):
    return db.query(Concurrent).filter_by(ao_id=ao_id).order_by(Concurrent.rang).all()


@router.get("/stats/pipeline")
def pipeline_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    stats = db.query(AppelOffre.statut, func.count(AppelOffre.id)).group_by(AppelOffre.statut).all()
    return {s: c for s, c in stats}


@router.post("/import-historique")
async def import_historique(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Analyse a ZIP archive containing all documents of one historical AO."""
    upload_dir = os.path.join(settings.UPLOAD_DIR, "historique", "tmp")
    Path(upload_dir).mkdir(parents=True, exist_ok=True)

    safe_name = os.path.basename(file.filename or "archive.zip")
    zip_path = os.path.join(upload_dir, safe_name)
    content = await file.read()
    with open(zip_path, "wb") as f:
        f.write(content)

    zip_dir = zip_path + "_extracted"
    os.makedirs(zip_dir, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(zip_dir)
    except Exception as e:
        return {"error": f"Archive ZIP invalide : {e}", "extracted_data": None}

    all_text_parts = []
    scanned_pdfs = []

    for root, _, fs in os.walk(zip_dir):
        for fname in fs:
            fpath = os.path.join(root, fname)
            text = extract_text(fpath)
            if text:
                all_text_parts.append(f"=== {fname} ===\n{text}")
            elif fpath.lower().endswith(".pdf"):
                scanned_pdfs.append(fpath)

    if all_text_parts:
        combined = "\n\n".join(all_text_parts)
        try:
            extracted = ai_service.analyse_historique(combined)
        except Exception as e:
            return {"error": str(e), "extracted_data": None}
    elif scanned_pdfs:
        from ..services.ocr_service import pdf_to_images_base64
        all_images: list = []
        for fp in scanned_pdfs[:3]:
            imgs = pdf_to_images_base64(fp, max_pages=5)
            all_images.extend(imgs)
            if len(all_images) >= 15:
                break
        if not all_images:
            return {"error": "Aucun document lisible dans l'archive", "extracted_data": None}
        try:
            extracted = ai_service.analyse_historique_images(all_images[:15])
        except Exception as e:
            return {"error": str(e), "extracted_data": None}
    else:
        return {"error": "Aucun document reconnu dans l'archive", "extracted_data": None}

    return {"extracted_data": extracted, "source_zip": safe_name}


@router.post("/confirm-historique-bulk")
def confirm_historique_bulk(data: dict, db: Session = Depends(get_db)):
    """Bulk-save historical AOs after review."""
    items = data.get("items", [])
    saved = []
    for extracted in items:
        from datetime import datetime
        date_limite = None
        if extracted.get("date_limite"):
            try:
                date_limite = datetime.fromisoformat(extracted["date_limite"].replace(" ", "T"))
            except Exception:
                pass
        ao = AppelOffre(
            reference=extracted.get("reference"),
            objet=extracted.get("objet"),
            maitre_ouvrage=extracted.get("maitre_ouvrage"),
            date_limite=date_limite,
            procedure=extracted.get("procedure"),
            domaine=extracted.get("domaine"),
            reserve_tpme=extracted.get("reserve_tpme", False),
            estimation=extracted.get("estimation"),
            lots=extracted.get("lots"),
            caution_provisoire=extracted.get("caution_provisoire"),
            delai_execution=extracted.get("delai_execution"),
            statut=extracted.get("statut", "en_instance"),
            decision=extracted.get("decision", "non"),
            notes=extracted.get("notes_import"),
        )
        db.add(ao)
        db.flush()
        saved.append({"ao_id": ao.id, "reference": ao.reference, "statut": ao.statut})
    db.commit()
    return {"saved": saved, "count": len(saved)}


def _generate_warnings(extracted: dict) -> list:
    warnings = []
    if not extracted.get("reference"):
        warnings.append("⚠️ Référence AO non détectée")
    if not extracted.get("date_limite"):
        warnings.append("⚠️ Date limite non détectée")
    if not extracted.get("estimation"):
        warnings.append("⚠️ Estimation MO non détectée")
    est = extracted.get("estimation")
    caut = extracted.get("caution_provisoire")
    if est and caut:
        expected = est * 0.015
        if abs(caut - expected) / expected > 0.1:
            warnings.append(f"⚠️ Caution provisoire {caut} ≠ 1.5% estimation ({expected:.0f})")
    return warnings
