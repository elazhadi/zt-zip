import os
import base64
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from ..database import get_db
from ..models.resultat_ao import ResultatAO
from ..models.ao import AppelOffre
from ..services import ai_service
from ..config import settings

router = APIRouter(prefix="/resultats", tags=["resultats"])


def _auto_link_ao(db: Session, objet: str | None, maitre_ouvrage: str | None) -> int | None:
    """Try to find an existing AO matching this result by fuzzy text similarity."""
    if not objet:
        return None
    # Normalize: lowercase, strip whitespace
    objet_lower = (objet or "").lower().strip()
    candidates = db.query(AppelOffre).all()
    best_id = None
    best_score = 0
    for ao in candidates:
        ao_objet = (ao.objet or "").lower().strip()
        # Simple word-overlap score
        words_result = set(objet_lower.split())
        words_ao = set(ao_objet.split())
        if not words_ao:
            continue
        common = words_result & words_ao
        score = len(common) / max(len(words_result), len(words_ao))
        # Bonus if maitre_ouvrage matches
        if maitre_ouvrage and ao.maitre_ouvrage:
            mo_str = str(ao.maitre_ouvrage).lower()
            if maitre_ouvrage.lower() in mo_str:
                score += 0.2
        if score > best_score and score >= 0.5:
            best_score = score
            best_id = ao.id
    return best_id


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image trop grande (max 10 Mo)")

    ext = (file.filename or "").split(".")[-1].lower()
    media_types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    media_type = media_types.get(ext, "image/jpeg")

    # Save image
    upload_dir = os.path.join(settings.UPLOAD_DIR, "resultats")
    os.makedirs(upload_dir, exist_ok=True)
    fname = f"resultat_{int(__import__('time').time())}.{ext}"
    fpath = os.path.join(upload_dir, fname)
    with open(fpath, "wb") as f:
        f.write(data)

    # AI extraction
    image_b64 = base64.b64encode(data).decode()
    extracted = ai_service.analyse_resultats_image(image_b64, media_type)

    # Save to DB
    concurrents = extracted.get("concurrents") or []
    md = extracted.get("mieux_disant") or {}
    objet = extracted.get("objet")
    maitre_ouvrage = extracted.get("maitre_ouvrage")

    # Auto-link with existing AO
    ao_id = _auto_link_ao(db, objet, maitre_ouvrage)

    resultat = ResultatAO(
        ao_id=ao_id,
        objet=objet,
        maitre_ouvrage=maitre_ouvrage,
        date_seance=extracted.get("date_seance"),
        estimation_mo=extracted.get("estimation_mo"),
        image_path=fpath,
        concurrents=concurrents,
        mieux_disant_nom=md.get("nom"),
        mieux_disant_offre=md.get("offre_ht"),
        mieux_disant_pct=md.get("pct_estimation"),
    )
    db.add(resultat)
    db.commit()
    db.refresh(resultat)

    return {
        "id": resultat.id,
        "ao_id": resultat.ao_id,
        "objet": resultat.objet,
        "maitre_ouvrage": resultat.maitre_ouvrage,
        "date_seance": resultat.date_seance,
        "estimation_mo": resultat.estimation_mo,
        "concurrents": resultat.concurrents,
        "mieux_disant": {
            "nom": resultat.mieux_disant_nom,
            "offre_ht": resultat.mieux_disant_offre,
            "pct_estimation": resultat.mieux_disant_pct,
        },
        "notes": extracted.get("notes"),
        "ao_lie": ao_id is not None,
    }


@router.get("/")
def list_resultats(
    domaine: str = "",
    db: Session = Depends(get_db)
):
    q = db.query(ResultatAO)
    if domaine:
        q = q.filter(ResultatAO.domaine == domaine)
    rows = q.order_by(ResultatAO.created_at.desc()).all()
    result = []
    for r in rows:
        ao_ref = None
        if r.ao_id and r.ao:
            ao_ref = {"id": r.ao_id, "reference": r.ao.reference, "objet": r.ao.objet}
        result.append({
            "id": r.id,
            "ao_id": r.ao_id,
            "ao_lie": ao_ref,
            "objet": r.objet,
            "maitre_ouvrage": r.maitre_ouvrage,
            "domaine": r.domaine,
            "date_seance": r.date_seance,
            "estimation_mo": r.estimation_mo,
            "image_path": r.image_path,
            "concurrents": r.concurrents,
            "mieux_disant_nom": r.mieux_disant_nom,
            "mieux_disant_offre": r.mieux_disant_offre,
            "mieux_disant_pct": r.mieux_disant_pct,
            "notre_societe": r.notre_societe,
            "notre_offre": r.notre_offre,
            "notre_rang": r.notre_rang,
            "created_at": r.created_at,
        })
    return result


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    resultats = db.query(ResultatAO).all()
    total = len(resultats)
    all_pcts = []
    concurrents_count: dict = {}

    for r in resultats:
        for c in (r.concurrents or []):
            if c.get("pct_estimation"):
                all_pcts.append(c["pct_estimation"])
            nom = c.get("nom", "")
            if nom:
                concurrents_count[nom] = concurrents_count.get(nom, 0) + 1

    top_concurrents = sorted(concurrents_count.items(), key=lambda x: -x[1])[:10]
    avg_pct = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else None
    min_pct = round(min(all_pcts), 1) if all_pcts else None
    max_pct = round(max(all_pcts), 1) if all_pcts else None

    return {
        "total_resultats": total,
        "avg_pct_estimation": avg_pct,
        "min_pct": min_pct,
        "max_pct": max_pct,
        "top_concurrents": [{"nom": n, "participations": c} for n, c in top_concurrents],
    }


@router.post("/recommander")
def recommander(
    estimation: float,
    domaine: str = "",
    db: Session = Depends(get_db)
):
    resultats = db.query(ResultatAO)
    if domaine:
        resultats = resultats.filter(ResultatAO.domaine == domaine)
    historique = [{"concurrents": r.concurrents} for r in resultats.all()]
    return ai_service.recommander_offre(historique, estimation, domaine)


@router.put("/{id}")
def update_resultat(
    id: int,
    data: dict,
    db: Session = Depends(get_db)
):
    r = db.query(ResultatAO).filter(ResultatAO.id == id).first()
    if not r:
        raise HTTPException(404, "Résultat introuvable")
    for k, v in data.items():
        if hasattr(r, k):
            setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{id}")
def delete_resultat(id: int, db: Session = Depends(get_db)):
    r = db.query(ResultatAO).filter(ResultatAO.id == id).first()
    if not r:
        raise HTTPException(404, "Résultat introuvable")
    db.delete(r)
    db.commit()
    return {"ok": True}
