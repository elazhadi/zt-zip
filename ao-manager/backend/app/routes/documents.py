"""
Extra document routes: descriptif fournisseur, prospectus, etc.
"""
import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppelOffre, Societe
from ..config import settings
from ..services import ai_service, doc_generator
from ..services.ocr_service import extract_text

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/descriptif-fournisseur")
def export_descriptif_fournisseur(body: dict, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(body["ao_id"])
    if not ao:
        raise HTTPException(404)
    societe = db.query(Societe).get(body["societe_id"])
    if not societe:
        raise HTTPException(404)

    # Extract articles
    lots = ao.lots or []
    all_articles = []
    for lot in (lots if isinstance(lots, list) else [lots]):
        all_articles.extend(lot.get("articles", []))

    article_filter = body.get("article_numero")
    if article_filter is not None:
        all_articles = [a for a in all_articles if a.get("numero") == article_filter]

    if not all_articles:
        raise HTTPException(400, "Aucun article trouvé")

    out_dir = os.path.join(settings.UPLOAD_DIR, "generated", "descriptifs")
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    result = doc_generator.generate_descriptif_fournisseur(
        societe=societe,
        ao=ao,
        articles=all_articles,
        langue=body.get("langue", "fr"),
        output_dir=out_dir
    )
    return result


@router.post("/prospectus/verify")
async def verify_prospectus(
    ao_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ao = db.query(AppelOffre).get(ao_id)
    if not ao:
        raise HTTPException(404)

    tmp_path = os.path.join(settings.UPLOAD_DIR, "tmp", file.filename)
    Path(os.path.dirname(tmp_path)).mkdir(parents=True, exist_ok=True)
    with open(tmp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    prospectus_text = extract_text(tmp_path)

    # Build CPS specs from AO
    lots = ao.lots or []
    specs_parts = []
    for lot in (lots if isinstance(lots, list) else [lots]):
        for art in lot.get("articles", []):
            specs_parts.append(
                f"Article {art.get('numero', '')}: {art.get('designation', '')}\n"
                f"Spécifications: {art.get('specifications_techniques', '')}\n"
                f"Marque/Norme: {art.get('marque_exigee', '')} {art.get('norme', '')}"
            )
    specs_cps = "\n\n".join(specs_parts)

    try:
        rapport = ai_service.check_prospectus_conformity(specs_cps, prospectus_text)
    except Exception as e:
        raise HTTPException(500, f"Erreur analyse conformité: {e}")

    # Save prospectus
    dest_dir = os.path.join(settings.UPLOAD_DIR, "prospectus", str(ao_id))
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    dest = os.path.join(dest_dir, file.filename)
    shutil.move(tmp_path, dest)

    return {
        "rapport": rapport,
        "prospectus_path": dest,
        "score": rapport.get("score_global", 0)
    }


@router.post("/prospectus/generate")
def generate_prospectus_ia(body: dict, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).get(body["ao_id"])
    if not ao:
        raise HTTPException(404)

    lots = ao.lots or []
    specs_parts = []
    for lot in (lots if isinstance(lots, list) else [lots]):
        for art in lot.get("articles", []):
            specs_parts.append(
                f"Article {art.get('numero', '')}: {art.get('designation', '')}\n"
                f"Spécifications: {art.get('specifications_techniques', '')}\n"
                f"Marque/Norme: {art.get('marque_exigee', '')} {art.get('norme', '')}"
            )
    specs_cps = "\n\n".join(specs_parts)

    prompt_rectification = body.get("prompt_rectification", "")
    try:
        content = ai_service.generate_prospectus_content(specs_cps, prompt_rectification)
    except Exception as e:
        raise HTTPException(500, f"Erreur génération: {e}")

    return {
        "content": content,
        "ao_reference": ao.reference,
    }


@router.get("/file/{path:path}")
def serve_file(path: str):
    full_path = os.path.join(settings.UPLOAD_DIR, path)
    if not os.path.exists(full_path):
        raise HTTPException(404, "Fichier non trouvé")
    return FileResponse(full_path)
