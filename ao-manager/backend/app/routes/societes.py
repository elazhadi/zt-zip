import os
import shutil
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Societe, DocumentRef
from ..models.user import User
from ..schemas import SocieteCreate, SocieteUpdate, SocieteOut
from ..config import settings
from ..services import ai_service
from .auth import get_current_user

router = APIRouter(prefix="/societes", tags=["Sociétés"])


@router.get("/", response_model=List[SocieteOut])
def list_societes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Societe).order_by(Societe.code)
    if not current_user.is_super_admin and current_user.societes_autorisees is not None:
        q = q.filter(Societe.id.in_(current_user.societes_autorisees or []))
    return q.all()


@router.post("/", response_model=SocieteOut, status_code=201)
def create_societe(data: SocieteCreate, db: Session = Depends(get_db)):
    if db.query(Societe).filter_by(code=data.code).first():
        raise HTTPException(400, f"Code '{data.code}' déjà utilisé")
    s = Societe(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/{societe_id}", response_model=SocieteOut)
def get_societe(
    societe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")
    if not current_user.can_access_societe(societe_id):
        raise HTTPException(403, "Accès refusé à cette société")
    return s


@router.put("/{societe_id}", response_model=SocieteOut)
def update_societe(societe_id: int, data: SocieteUpdate, db: Session = Depends(get_db)):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{societe_id}", status_code=204)
def delete_societe(societe_id: int, db: Session = Depends(get_db)):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")
    db.delete(s)
    db.commit()


@router.post("/{societe_id}/logo")
async def upload_logo(societe_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")
    dest_dir = os.path.join(settings.UPLOAD_DIR, "logos")
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg"):
        raise HTTPException(400, "Format accepté : PNG, JPG")
    rel_path = f"logos/logo_{societe_id}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, rel_path)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    s.logo_path = rel_path
    db.commit()
    return {"logo_path": rel_path}


@router.post("/{societe_id}/entete")
async def upload_entete(societe_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")
    dest_dir = os.path.join(settings.UPLOAD_DIR, "entetes")
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    rel_path = f"entetes/entete_{societe_id}.docx"
    dest = os.path.join(settings.UPLOAD_DIR, rel_path)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    s.entete_path = rel_path
    db.commit()
    return {"entete_path": rel_path}


# --- Documents référentiel ---

@router.get("/{societe_id}/documents")
def list_documents(societe_id: int, db: Session = Depends(get_db)):
    docs = db.query(DocumentRef).filter_by(societe_id=societe_id, actif=True).all()
    today = date.today()
    result = []
    for d in docs:
        warnings = []
        if d.date_expiration:
            delta = (d.date_expiration - today).days
            if delta < 0:
                warnings.append(f"Expiré depuis {-delta} jours")
            elif delta <= 7:
                warnings.append(f"⚠️ Expire dans {delta} jours")
            elif delta <= 15:
                warnings.append(f"⚠️ Expire dans {delta} jours")
            elif delta <= 30:
                warnings.append(f"⚠️ Expire dans {delta} jours")
        result.append({
            "id": d.id,
            "type_doc": d.type_doc,
            "file_path": d.file_path,
            "date_certification": d.date_certification,
            "date_expiration": d.date_expiration,
            "infos_extraites": d.infos_extraites,
            "version": d.version,
            "warnings": warnings,
            "created_at": d.created_at,
        })
    return result


@router.post("/{societe_id}/documents/statut")
async def upload_statut(
    societe_id: int,
    file: UploadFile = File(...),
    date_certification: str = Form(...),
    db: Session = Depends(get_db)
):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")

    dest_dir = os.path.join(settings.UPLOAD_DIR, "docs", str(societe_id))
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    dest = os.path.join(dest_dir, f"STATUT_{societe_id}_v{_next_version(db, societe_id, 'statut')}.pdf")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    cert_date = date.fromisoformat(date_certification)
    exp_date = cert_date + timedelta(days=90)

    # Deactivate previous
    db.query(DocumentRef).filter_by(societe_id=societe_id, type_doc="statut").update({"actif": False})

    doc = DocumentRef(
        societe_id=societe_id,
        type_doc="statut",
        file_path=dest,
        date_certification=cert_date,
        date_expiration=exp_date,
        version=_next_version(db, societe_id, "statut"),
        actif=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    delta = (exp_date - date.today()).days
    warnings = []
    if delta <= 30:
        warnings.append(f"⚠️ Expire dans {delta} jours")
    return {"id": doc.id, "date_expiration": exp_date, "warnings": warnings}


@router.post("/{societe_id}/documents/attestation")
async def upload_attestation(
    societe_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    s = db.query(Societe).get(societe_id)
    if not s:
        raise HTTPException(404, "Société non trouvée")

    dest_dir = os.path.join(settings.UPLOAD_DIR, "docs", str(societe_id))
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    ver = _next_version(db, societe_id, "attestation_ref")
    dest = os.path.join(dest_dir, f"ATTESTATION_{societe_id}_v{ver}.pdf")
    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)

    # AI extraction
    from ..services.ocr_service import extract_text
    infos = {}
    try:
        text = extract_text(dest)
        if text:
            infos = ai_service.extract_attestation_info(text)
    except Exception as e:
        infos = {"extraction_error": str(e)}

    today = date.today()
    exp_date = today + timedelta(days=90)

    # Check if updating existing attestation
    existing = db.query(DocumentRef).filter_by(
        societe_id=societe_id, type_doc="attestation_ref", actif=True
    ).first()

    if existing:
        existing.file_path = dest
        existing.date_certification = today
        existing.date_expiration = exp_date
        existing.version = ver
        existing.infos_extraites = {**(existing.infos_extraites or {}), **infos, "file_path": dest}
        db.commit()
        return {"id": existing.id, "infos_extraites": existing.infos_extraites, "date_expiration": exp_date, "updated": True}

    doc = DocumentRef(
        societe_id=societe_id,
        type_doc="attestation_ref",
        file_path=dest,
        date_certification=today,
        date_expiration=exp_date,
        infos_extraites=infos,
        version=ver,
        actif=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "infos_extraites": infos, "date_expiration": exp_date}


def _next_version(db: Session, societe_id: int, type_doc: str) -> int:
    from sqlalchemy import func
    max_v = db.query(func.max(DocumentRef.version)).filter_by(
        societe_id=societe_id, type_doc=type_doc
    ).scalar()
    return (max_v or 0) + 1
