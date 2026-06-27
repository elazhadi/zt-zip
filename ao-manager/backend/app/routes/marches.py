import math
import os
from datetime import date
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppelOffre, Societe, Marche
from ..schemas import MarcheCreate, MarcheUpdate, MarcheOut
from ..config import settings
from ..services import doc_generator

router = APIRouter(prefix="/marches", tags=["Marchés"])


@router.get("/", response_model=List[MarcheOut])
def list_marches(db: Session = Depends(get_db)):
    return db.query(Marche).order_by(Marche.created_at.desc()).all()


@router.post("/", response_model=MarcheOut, status_code=201)
def create_marche(data: MarcheCreate, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(data.ao_id)
    if not ao:
        raise HTTPException(404, "AO non trouvé")

    montant_ht = data.montant_ht or 0
    caution = math.ceil(montant_ht * 0.03)
    retenue = round(montant_ht * 0.07, 2)

    m = Marche(
        ao_id=data.ao_id,
        reponse_id=data.reponse_id,
        societe_id=data.societe_id,
        numero_marche=data.numero_marche,
        montant_ht=montant_ht,
        montant_ttc=data.montant_ttc,
        caution_definitive=caution,
        retenue_garantie=retenue,
        statut_execution="adjudication",
        etapes=[],
        fichiers={},
    )
    db.add(m)
    ao.statut = "en_adjudication"
    db.commit()
    db.refresh(m)
    return m


@router.get("/{marche_id}", response_model=MarcheOut)
def get_marche(marche_id: int, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404, "Marché non trouvé")
    return m


@router.put("/{marche_id}", response_model=MarcheOut)
def update_marche(marche_id: int, data: MarcheUpdate, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    if data.montant_ht:
        m.caution_definitive = math.ceil(float(data.montant_ht) * 0.03)
        m.retenue_garantie = round(float(data.montant_ht) * 0.07, 2)
    db.commit()
    db.refresh(m)
    return m


@router.post("/{marche_id}/etape")
def add_etape(marche_id: int, body: dict, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    etapes = list(m.etapes or [])
    etapes.append({**body, "date": str(date.today())})
    m.etapes = etapes
    m.statut_execution = body.get("etape", m.statut_execution)

    # Update AO statut based on etape
    statut_map = {
        "pv_reception_provisoire": "en_garantie",
        "facturation": "en_paiement",
        "paiement": "en_paiement",
        "cloture": "cloture",
    }
    ao_statut = statut_map.get(body.get("etape"))
    if ao_statut:
        ao = db.query(AppelOffre).get(m.ao_id)
        if ao:
            ao.statut = ao_statut

    db.commit()
    return {"etapes": m.etapes}


@router.post("/{marche_id}/upload-doc")
async def upload_doc(
    marche_id: int,
    file: UploadFile = File(...),
    etape: str = Form(...),
    db: Session = Depends(get_db)
):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    dest_dir = os.path.join(settings.UPLOAD_DIR, "docs", "marches", str(marche_id))
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    dest = os.path.join(dest_dir, f"{etape}_{file.filename}")
    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)
    fichiers = dict(m.fichiers or {})
    fichiers[etape] = dest
    m.fichiers = fichiers
    db.commit()
    return {"etape": etape, "file_path": dest}


@router.post("/{marche_id}/caution-definitive")
def generate_caution(marche_id: int, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    ao = db.query(AppelOffre).get(m.ao_id)
    societe = db.query(Societe).get(m.societe_id)
    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "cautions")
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    return doc_generator.generate_demande_caution_definitive(societe, m, ao, out_dir)


@router.post("/{marche_id}/main-levee")
def generate_main_levee(marche_id: int, body: dict, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    societe = db.query(Societe).get(m.societe_id)
    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "main_levee")
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    return doc_generator.generate_main_levee(societe, m, body.get("date_pv_rd", ""), out_dir)


@router.post("/{marche_id}/excel-enregistrement")
def generate_excel(marche_id: int, body: dict, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    ao = db.query(AppelOffre).get(m.ao_id)
    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "excel")
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    path = doc_generator.generate_excel_enregistrement(m, ao, body.get("periodicite", "unique"), out_dir)
    return {"file_path": path}


@router.get("/{marche_id}/dashboard")
def financial_dashboard(marche_id: int, db: Session = Depends(get_db)):
    m = db.query(Marche).get(marche_id)
    if not m:
        raise HTTPException(404)
    mht = float(m.montant_ht or 0)
    mttc = float(m.montant_ttc or 0)
    caut = float(m.caution_definitive or 0)
    ret = float(m.retenue_garantie or 0)
    etapes = m.etapes or []
    montant_facture = next((e.get("montant_facture", 0) for e in etapes if e.get("etape") == "facturation"), 0)
    montant_recu = next((e.get("montant_recu", 0) for e in etapes if e.get("etape") == "paiement"), 0)
    return {
        "montant_ht": mht,
        "montant_ttc": mttc,
        "caution_definitive_3pct": caut,
        "retenue_garantie_7pct": ret,
        "montant_facture": montant_facture,
        "montant_recu": montant_recu,
        "restant_a_percevoir": round(mht - float(montant_recu), 2),
        "statut_caution": "active",
        "statut_retenue": "bloquee",
    }
