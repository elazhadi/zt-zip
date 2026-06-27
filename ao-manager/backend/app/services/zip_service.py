"""
ZIP packaging service for AO responses.
Structure: [JJ.MM] -[CODE]- [OBJET_COURT].zip
"""
import os
import shutil
import zipfile
from datetime import date
from pathlib import Path
from typing import Optional, Any


def _short_objet(objet: str, max_len: int = 30) -> str:
    if not objet:
        return "AO"
    objet = objet.strip()
    if len(objet) > max_len:
        objet = objet[:max_len].rsplit(" ", 1)[0]
    return objet.replace("/", "-").replace("\\", "-")


def create_response_zip(
    ao: Any,
    societe: Any,
    reponse: Any,
    generated_files: dict,
    dao_files: list,
    output_dir: str
) -> str:
    """
    Creates the full ZIP structure for a tender response.
    generated_files: {
        "dh": {"docx": "...", "pdf": "..."},
        "ae": {"docx": "...", "pdf": "..."},
        "bp": {"docx": "...", "pdf": "...", "xlsx": "..."},
        "htm": {"docx": "...", "pdf": "..."},  # optional
        "statut": "...",  # path to statut PDF
        "rc_cps": ["...", "..."],  # paths
        "prospectus": [...],  # optional
        "offre_technique": [...],  # optional
    }
    """
    today = date.today()
    date_prefix = today.strftime("%d.%m")
    objet_court = _short_objet(ao.objet or "AO")
    zip_name = f"{date_prefix} -{societe.code}- {objet_court}.zip"
    zip_path = os.path.join(output_dir, zip_name)

    societe_nom = societe.raison_sociale.upper()

    tmp_dir = os.path.join(output_dir, "_tmp_zip")
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
    os.makedirs(tmp_dir)

    # DAO/
    dao_dir = os.path.join(tmp_dir, "DAO")
    os.makedirs(dao_dir)
    for f in (dao_files or []):
        if os.path.exists(f):
            shutil.copy2(f, dao_dir)

    # Réponse-[NOM]/
    rep_dir = os.path.join(tmp_dir, f"Réponse- {societe.code}")
    os.makedirs(rep_dir)

    # Dossiers Administratif et Technique/
    dat_dir = os.path.join(rep_dir, "Dossiers Administratif et Technique")
    os.makedirs(dat_dir)

    # Dossier Administratif/
    da_dir = os.path.join(dat_dir, "Dossier Administratif")
    os.makedirs(da_dir)
    for key in ("docx", "pdf"):
        src = (generated_files.get("dh") or {}).get(key)
        if src and os.path.exists(src):
            shutil.copy2(src, da_dir)
    statut_src = generated_files.get("statut")
    if statut_src and os.path.exists(statut_src):
        shutil.copy2(statut_src, os.path.join(da_dir, f"STATUT {societe.code}.pdf"))

    # Dossier Technique/
    dt_dir = os.path.join(dat_dir, "Dossier Technique")
    os.makedirs(dt_dir)
    for key in ("docx", "pdf"):
        src = (generated_files.get("htm") or {}).get(key)
        if src and os.path.exists(src):
            shutil.copy2(src, dt_dir)

    # RC & CPS/
    rc_dir = os.path.join(dat_dir, "RC & CPS")
    os.makedirs(rc_dir)
    for f in (generated_files.get("rc_cps") or []):
        if f and os.path.exists(f):
            shutil.copy2(f, rc_dir)

    # Offre Financière/
    of_dir = os.path.join(rep_dir, "Offre Financière")
    os.makedirs(of_dir)
    for doc_key in ("ae", "bp"):
        doc_files = generated_files.get(doc_key) or {}
        for ext in ("docx", "pdf", "xlsx"):
            src = doc_files.get(ext)
            if src and os.path.exists(src):
                shutil.copy2(src, of_dir)

    # Offre Technique/ — ALWAYS present
    ot_dir = os.path.join(rep_dir, "Offre Technique")
    os.makedirs(ot_dir)
    offre_technique_files = generated_files.get("offre_technique") or []
    if offre_technique_files:
        for f in offre_technique_files:
            if f and os.path.exists(f):
                shutil.copy2(f, ot_dir)
    else:
        # v1: create README placeholder
        criteres = ao.criteres_notation or []
        seuil = (ao.notation_technique or {}).get("seuil_elimination") if ao.notation_technique else None
        readme_content = _build_readme_offre_technique(ao, criteres, seuil)
        with open(os.path.join(ot_dir, "README_A_COMPLETER.txt"), "w", encoding="utf-8") as f:
            f.write(readme_content)

    # Prospectus/ — only if required
    if ao.prospectus_exige and generated_files.get("prospectus"):
        pros_dir = os.path.join(rep_dir, "Prospectus")
        os.makedirs(pros_dir)
        for f in generated_files.get("prospectus", []):
            if f and os.path.exists(f):
                shutil.copy2(f, pros_dir)
        # Enveloppe
        _create_enveloppe_pdf(societe, ao, pros_dir)

    # Create ZIP
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(tmp_dir):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, tmp_dir)
                zf.write(full_path, arcname)

    shutil.rmtree(tmp_dir, ignore_errors=True)
    return zip_path


def _build_readme_offre_technique(ao: Any, criteres: list, seuil: Any) -> str:
    lines = [
        "OFFRE TECHNIQUE — À COMPLÉTER",
        "=" * 50,
        "",
        f"AO N° : {ao.reference or 'N/A'}",
        f"Objet : {ao.objet or 'N/A'}",
        "",
        "CRITÈRES DE NOTATION DÉTECTÉS :",
        "-" * 40,
    ]
    if criteres:
        for i, c in enumerate(criteres, 1):
            if isinstance(c, dict):
                lines.append(f"{i}. {c.get('critere', '')} — Poids : {c.get('poids', 'N/A')}")
                if c.get("details"):
                    lines.append(f"   Détail : {c['details']}")
            else:
                lines.append(f"{i}. {c}")
    else:
        lines.append("Aucun critère détecté automatiquement. Vérifier le RC/CPS.")

    if seuil:
        lines.extend(["", f"SEUIL D'ÉLIMINATION : {seuil} points"])

    lines.extend([
        "",
        "DOCUMENTS À PRODUIRE (selon RC) :",
        "-" * 40,
        "□ Références similaires",
        "□ Moyens humains dédiés",
        "□ Moyens matériels",
        "□ Méthodologie d'exécution",
        "",
        "⚠️  Ce dossier sera complété manuellement en v2.",
    ])
    return "\n".join(lines)


def _create_enveloppe_pdf(societe: Any, ao: Any, output_dir: str):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        path = os.path.join(output_dir, f"Enveloppe {societe.code}.pdf")
        c = canvas.Canvas(path, pagesize=A4)
        w, h = A4

        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h - 100, "ENVELOPPE OFFRE")
        c.setFont("Helvetica", 12)
        c.drawCentredString(w / 2, h - 140, f"AO N° {ao.reference or 'N/A'}")
        c.drawCentredString(w / 2, h - 165, f"{ao.objet or ''}")
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(w / 2, h / 2, societe.raison_sociale)
        c.drawCentredString(w / 2, h / 2 - 30, f"Code : {societe.code}")
        c.save()
    except Exception:
        pass
