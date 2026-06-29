import os
import math
from datetime import date
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppelOffre, Societe, Reponse
from ..schemas import ReponseCreate, ReponseOut, PrixDistribution
from ..config import settings
from ..services import ai_service
from ..services import doc_generator, zip_service

router = APIRouter(prefix="/reponses", tags=["Réponses"])


@router.get("/ao/{ao_id}", response_model=List[ReponseOut])
def list_by_ao(ao_id: int, db: Session = Depends(get_db)):
    return db.query(Reponse).filter_by(ao_id=ao_id).all()


@router.post("/distribute-prices")
def distribute_prices(body: dict, db: Session = Depends(get_db)):
    """
    Calcule la répartition des prix sur les articles BP.
    body: {ao_id, societe_id, pct_estimation}
    Returns: {articles, total_ht, total_ttc, tva_rate}
    """
    ao = db.query(AppelOffre).get(body["ao_id"])
    if not ao:
        raise HTTPException(404, "AO non trouvé")
    if not ao.estimation:
        raise HTTPException(400, "Estimation MO manquante")

    pct = float(body["pct_estimation"]) / 100
    montant_ht = round(float(ao.estimation) * pct, 2)
    tva_rate = 0.20
    montant_ttc = round(montant_ht * (1 + tva_rate), 2)

    # Extract articles from lots
    articles = _extract_articles(ao.lots)
    if not articles:
        raise HTTPException(400, "Aucun article trouvé dans le bordereau")

    warnings = []
    try:
        distribution = ai_service.distribute_prices(articles, montant_ht)
        articles_avec_prix = distribution.get("articles", [])
    except Exception as e:
        warnings.append(f"Répartition IA échouée, répartition uniforme appliquée : {str(e)}")
        articles_avec_prix = _uniform_distribution(articles, montant_ht)

    return {
        "articles": articles_avec_prix,
        "total_ht": montant_ht,
        "total_ttc": montant_ttc,
        "tva_rate": tva_rate,
        "pct_estimation": body["pct_estimation"],
        "estimation_mo": float(ao.estimation),
        "warnings": warnings,
    }


@router.post("/generate", status_code=201)
def generate_response(body: dict, db: Session = Depends(get_db)):
    """
    Full response generation: DH + AE + BP + ZIP
    body: {ao_id, societe_id, pct_estimation, prix_detail, ignore_warnings}
    """
    ao = db.query(AppelOffre).get(body["ao_id"])
    if not ao:
        raise HTTPException(404, "AO non trouvé")
    societe = db.query(Societe).get(body["societe_id"])
    if not societe:
        raise HTTPException(404, "Société non trouvée")

    pct = float(body["pct_estimation"]) / 100
    montant_ht = round(float(ao.estimation or 0) * pct, 2)
    montant_ttc = round(montant_ht * 1.20, 2)
    prix_detail = body.get("prix_detail", [])

    # Check doc warnings (non-blocking)
    warnings = _check_doc_warnings(societe, db)

    # Output dir
    today = date.today()
    out_dir = os.path.join(
        settings.UPLOAD_DIR, "generated",
        str(societe.id), str(ao.id),
        today.strftime("%Y%m%d")
    )
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    generated = {}

    # DH
    try:
        generated["dh"] = doc_generator.generate_dh(societe, ao, out_dir)
    except Exception as e:
        warnings.append(f"⚠️ DH : {e}")

    # AE
    try:
        generated["ae"] = doc_generator.generate_ae(societe, ao, montant_ht, montant_ttc, out_dir)
    except Exception as e:
        warnings.append(f"⚠️ AE : {e}")

    # BP
    try:
        generated["bp"] = doc_generator.generate_bp(societe, ao, prix_detail, montant_ht, montant_ttc, out_dir)
    except Exception as e:
        warnings.append(f"⚠️ BP : {e}")

    # Statut (from reference docs)
    from ..models import DocumentRef
    statut_doc = db.query(DocumentRef).filter_by(
        societe_id=societe.id, type_doc="statut", actif=True
    ).order_by(DocumentRef.version.desc()).first()
    if statut_doc and statut_doc.file_path:
        generated["statut"] = statut_doc.file_path

    # RC & CPS from dao files
    rc_cps = []
    for f in (ao.fichiers_dao or []):
        name = os.path.basename(str(f)).upper()
        if "RC" in name or "CPS" in name:
            rc_cps.append(str(f))
    generated["rc_cps"] = rc_cps

    # Create ZIP
    dao_files = [str(f) for f in (ao.fichiers_dao or [])]
    try:
        zip_path = zip_service.create_response_zip(
            ao=ao, societe=societe, reponse=None,
            generated_files=generated,
            dao_files=dao_files,
            output_dir=out_dir
        )
    except Exception as e:
        warnings.append(f"⚠️ ZIP : {e}")
        zip_path = None

    # Save to DB
    reponse = Reponse(
        ao_id=ao.id,
        societe_id=societe.id,
        pct_estimation=body["pct_estimation"],
        montant_ht=montant_ht,
        montant_ttc=montant_ttc,
        prix_detail=prix_detail,
        fichiers_generes=generated,
        zip_path=zip_path,
    )
    db.add(reponse)
    ao.statut = "en_attente_de_resultats"
    ao.societe_soumissionnaire_id = societe.id
    db.commit()
    db.refresh(reponse)

    return {
        "reponse_id": reponse.id,
        "montant_ht": montant_ht,
        "montant_ttc": montant_ttc,
        "zip_path": zip_path,
        "generated_files": generated,
        "warnings": warnings,
    }


@router.get("/{reponse_id}/download-zip")
def download_zip(reponse_id: int, db: Session = Depends(get_db)):
    r = db.query(Reponse).get(reponse_id)
    if not r or not r.zip_path:
        raise HTTPException(404, "ZIP non trouvé")
    if not os.path.exists(r.zip_path):
        raise HTTPException(404, "Fichier ZIP introuvable sur le disque")
    return FileResponse(r.zip_path, media_type="application/zip",
                        filename=os.path.basename(r.zip_path))


@router.post("/{reponse_id}/maintien-offre")
def generate_maintien(reponse_id: int, body: dict, db: Session = Depends(get_db)):
    r = db.query(Reponse).get(reponse_id)
    if not r:
        raise HTTPException(404)
    ao = db.query(AppelOffre).get(r.ao_id)
    societe = db.query(Societe).get(r.societe_id)
    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "maintien")
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    result = doc_generator.generate_maintien_offre(
        societe=societe, ao=ao,
        montant_ttc=float(r.montant_ttc or 0),
        date_demande_mo=body.get("date_demande_mo", ""),
        nouvelle_date_validite=body.get("nouvelle_date_validite", ""),
        output_dir=out_dir
    )
    return result


@router.post("/{reponse_id}/refus-maintien")
def generate_refus(reponse_id: int, db: Session = Depends(get_db)):
    r = db.query(Reponse).get(reponse_id)
    if not r:
        raise HTTPException(404)
    ao = db.query(AppelOffre).get(r.ao_id)
    societe = db.query(Societe).get(r.societe_id)
    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "maintien")
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    return doc_generator.generate_refus_maintien(societe, ao, out_dir)


def _extract_articles(lots) -> list:
    articles = []
    if not lots:
        return articles
    for lot in (lots if isinstance(lots, list) else [lots]):
        for art in lot.get("articles", []):
            articles.append({
                "numero": art.get("numero"),
                "designation": art.get("designation", ""),
                "quantite": art.get("quantite") or 1,
                "unite": art.get("unite", "U"),
                "specifications_techniques": art.get("specifications_techniques", ""),
            })
    return articles


def _uniform_distribution(articles: list, total_ht: float) -> list:
    n = len(articles)
    if n == 0:
        return []
    unit_total = sum(a.get("quantite", 1) for a in articles)
    result = []
    running = 0.0
    for i, art in enumerate(articles):
        qty = art.get("quantite", 1) or 1
        if i == n - 1:
            montant = round(total_ht - running, 2)
        else:
            montant = round(total_ht * qty / unit_total, 2)
            running += montant
        prix_u = round(montant / qty, 2)
        result.append({**art, "prix_unitaire": prix_u, "montant": montant})
    return result


def _check_doc_warnings(societe, db) -> list:
    from ..models import DocumentRef
    from datetime import date, timedelta
    warnings = []
    today = date.today()
    for type_doc in ("statut", "attestation_ref"):
        doc = db.query(DocumentRef).filter_by(
            societe_id=societe.id, type_doc=type_doc, actif=True
        ).first()
        if not doc:
            warnings.append(f"⚠️ {type_doc} manquant pour {societe.code}")
        elif doc.date_expiration and (doc.date_expiration - today).days < 0:
            warnings.append(f"⚠️ {type_doc} expiré pour {societe.code}")
        elif doc.date_expiration and (doc.date_expiration - today).days <= 30:
            warnings.append(f"⚠️ {type_doc} expire dans {(doc.date_expiration - today).days} jours")
    return warnings
