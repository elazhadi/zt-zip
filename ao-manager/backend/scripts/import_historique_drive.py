"""
Migration script: import historical AOs from Google Drive folder structure.
Usage: DATABASE_URL="postgresql://..." python import_historique_drive.py
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import AppelOffre

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set.")
    print("Usage: DATABASE_URL='postgresql://...' python import_historique_drive.py")
    sys.exit(1)


def parse_date(dd_mm: str, year: int) -> str | None:
    """Parse DD.MM + year to ISO date string."""
    if not dd_mm:
        return None
    try:
        parts = dd_mm.replace("-", ".").split(".")
        day = int(parts[0])
        month = int(parts[1])
        return f"{year}-{month:02d}-{day:02d}"
    except Exception:
        return None


# ─── DATA ────────────────────────────────────────────────────────────────────
# Format: (objet, date_limite_iso, statut, decision, societe_hint, domaine_hint)
# societe_hint used for notes_import — user can assign societe in UI later.

AOS = [
    # ══════════════════════════════════════════════
    # WE CONCEPT — 1- AO Nouveau
    # ══════════════════════════════════════════════
    ("AMI 01RV-2026", None, "en_instance", None, "WC", None),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 2- AO En cours de réponse
    # ══════════════════════════════════════════════
    ("Matériel de sport DGPC", "2026-08-11", "en_cours_de_reponse", "oui", "WC", "fournitures"),
    ("Barrières Anti-inondation DGPC", "2026-08-12", "en_cours_de_reponse", "oui", "WC", "fournitures"),
    ("Conteneurs boulangerie DGPC PF", "2026-07-03", "en_cours_de_reponse", "oui", "WC", "fournitures"),
    ("Pavoisement Zouada", "2026-07-24", "en_cours_de_reponse", "oui", "WC", "pavoisement"),
    ("Toiles Tendues Laayoune", "2026-07-07", "en_cours_de_reponse", "oui", "WS", "stores"),
    ("Tentes ADN", "2026-07-22", "en_cours_de_reponse", "oui", "WS", "tentes"),
    ("Matériel de sauvetage DGPC", "2026-07-13", "en_cours_de_reponse", "oui", "WC", "fournitures"),
    ("Pavoisement Commune Rabat", "2026-07-14", "en_cours_de_reponse", "oui", "WS", "pavoisement"),
    ("FA ZN Sac Marin L3", "2026-07-22", "en_cours_de_reponse", "oui", "WS", "fournitures"),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 3- AO En Attente de Résultat
    # ══════════════════════════════════════════════
    ("Stores Justice Taroudant", "2026-06-30", "en_attente_de_resultats", "oui", "WS", "stores"),
    ("Tentes de groupement DGPC PF", "2026-05-08", "en_attente_de_resultats", "oui", "WC", "tentes"),
    ("Pavoisement Khemissat", "2026-06-30", "en_attente_de_resultats", "oui", "WS", "pavoisement"),
    ("Couchage ADN L6&7", "2026-04-28", "en_attente_de_resultats", "oui", "WC", "tentes"),
    ("Tentes ADN", "2026-04-28", "en_attente_de_resultats", "oui", "WC", "tentes"),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 4- AO Perdus & Annulés  (page 1)
    # ══════════════════════════════════════════════
    ("Pavoisement Moulay Abdellah", "2026-06-24", "annule", "non", "WS", "pavoisement"),
    ("Pavoisement Commune Hassan", "2026-06-22", "annule", "non", "WS", "pavoisement"),
    ("Stores Justice Settat", "2026-06-25", "annule", "non", "WC", "stores"),
    ("Ballons éclairants DGPC PF", "2026-06-16", "annule", "non", "WC", "fournitures"),
    ("Matelas DGPC PF L3", "2026-03-17", "annule", "non", "SL", "tentes"),
    ("Formation Jeunesse Beni Mellal", "2026-05-22", "annule", "non", "WC", None),
    ("Tentes FA ZN Lot 5", "2026-05-21", "annule", "non", "WC", "tentes"),
    ("Dalots Moulay Abdellah", "2026-05-19", "annule", "non", "WC", "travaux"),
    ("Couvertures DGPC PF", "2026-03-13", "annule", "non", "WC", "tentes"),
    ("Dalots Port de Tanger", "2026-03-16", "annule", "non", "WC", "travaux"),
    ("Divers Matériel DGPC", "2026-03-18", "annule", "non", "WC", "fournitures"),
    ("Pavoisement Zouada", "2026-04-10", "annule", "non", "WC", "pavoisement"),
    ("AMI Tentes Protection civile", "2024-12-16", "annule", "non", "WS", "tentes"),
    ("Ensacheuse DGPC PF", "2026-03-16", "annule", "non", "WC", "fournitures"),
    ("Pavoisement Tetouan", "2026-03-26", "annule", "non", "WC", "pavoisement"),
    ("Drapeaux ANCFCC", "2026-03-19", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Temara", "2026-03-10", "annule", "non", "WC", "pavoisement"),
    ("Matelas de saut PF DGPC", "2026-03-03", "annule", "non", "WC", "tentes"),
    ("Voilage Marriott Rabat", "2026-02-12", "annule", "non", "WC", "stores"),
    ("3 Lots Tentes Groupes Gendarmerie ADN", "2025-11-13", "annule", "non", "WC", "tentes"),
    ("Tentes de groupes Gendarmerie ADN", "2025-10-28", "annule", "non", "WC", "tentes"),
    ("Tentes ADN L1 & L2", "2025-07-25", "annule", "non", "WS", "tentes"),
    ("Dalots Berrechid", "2025-12-11", "annule", "non", "WCM", "travaux"),
    ("Pavoisement Hay Mohammadi", "2025-12-10", "annule", "non", "WS", "pavoisement"),
    ("Toile Tendue Marchica", "2025-12-17", "annule", "non", "WS", "stores"),
    ("Pavoisement Sidi Moumen", "2025-11-04", "annule", "non", "WC", "pavoisement"),
    ("Stores Infirmières Casa", "2025-10-28", "annule", "non", "WC", "stores"),
    ("Pavoisement Commune Casa", "2025-10-16", "annule", "non", "WC", "pavoisement"),
    ("Matériel de sport commune Casa", "2025-10-23", "annule", "non", "WC", "fournitures"),
    ("Pavoisement Lahraouine", "2025-10-23", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Bourouj", "2025-09-23", "annule", "non", "WC", "pavoisement"),
    ("Sacs Mortuaires PC PR", "2025-08-27", "annule", "non", "WS", "fournitures"),
    ("Couchage ADN L8 L9 L10", "2025-07-14", "annule", "non", "WS", "tentes"),
    ("Pavoisement TGR", "2025-06-17", "annule", "non", "WC", "pavoisement"),
    ("Faux plafond Méridien", "2025-06-27", "annule", "non", "WC", "amenagement"),
    ("Tentes ADN", "2025-06-02", "annule", "non", "WS", "tentes"),
    ("Peinture Touarga", "2025-06-19", "annule", "non", "WC", "travaux"),
    ("Pavoisement Tantan", "2025-07-10", "annule", "non", "WS", "pavoisement"),
    ("Matelas PC", "2025-06-10", "annule", "non", "WS", "tentes"),
    ("Tentes Jeunesse Ifrane", "2025-06-25", "annule", "non", "WS", "tentes"),
    ("Tentes Caidales Bouskoura", "2025-06-25", "annule", "non", "WC", "tentes"),
    ("Pavoisement Hassan Rabat", "2025-06-26", "annule", "non", "WS", "pavoisement"),
    ("Pavoisement Dakhla", "2025-06-24", "annule", "non", "WS", "pavoisement"),
    ("Bigues Barrières Bouskoura", "2025-06-25", "annule", "non", "WC", "fournitures"),
    ("Couchage Agri Dakhla", "2025-06-18", "annule", "non", "WS", "tentes"),
    ("Pavoisement Sidi Moumen", "2025-06-18", "annule", "non", "WS", "pavoisement"),
    ("Fêtes Sidi Moumen", "2025-06-18", "annule", "non", "WS", "fournitures"),
    ("Madaef Marrakech Nfis", "2025-05-15", "annule", "non", "WC", None),
    ("Pavoisement Marrakech", "2025-06-17", "annule", "non", "WC", "pavoisement"),
    ("Lits de camp PC", "2025-06-11", "annule", "non", "WS", "tentes"),

    # Page 2
    ("Stores Infirmières Casa", "2025-06-12", "annule", "non", "WS", "stores"),
    ("Couvertures PC", "2025-06-03", "annule", "non", "WS", "tentes"),
    ("Pavoisement Larache", "2025-06-03", "annule", "non", "WC", "pavoisement"),
    ("Aménagement Ministère parlement", "2025-05-13", "annule", "non", "WC", "amenagement"),
    ("Drapeaux Commune Tanger", "2025-05-22", "annule", "non", "WC", "pavoisement"),
    ("Tbourida CYM", "2025-05-19", "annule", "non", "WC", None),
    ("Bigues Commune Tanger", "2025-05-22", "annule", "non", "WC", "fournitures"),
    ("Barrières Tanger", "2025-05-13", "annule", "non", "WC", "fournitures"),
    ("Drapeau Marrakech", "2025-05-15", "annule", "non", "WC", "pavoisement"),
    ("Toile Tendue FM6 Oujda", "2025-04-18", "annule", "non", "WS", "stores"),
    ("Pavoisement Marrakech Medina", "2025-04-29", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Mers Sultan", "2025-04-30", "annule", "non", "WC", "pavoisement"),
    ("Barrières Dar Bouaazza", "2025-04-08", "annule", "non", "WS", "fournitures"),
    ("Pavoisement Meknes", "2025-04-04", "annule", "non", "WS", "pavoisement"),
    ("Parasols Protection Civile", "2025-03-24", "annule", "non", "WS", "fournitures"),
    ("Pavoisement Tetouan", "2025-03-25", "annule", "non", "WC", "pavoisement"),
    ("Campement Forêts Tanger", "2025-03-12", "annule", "non", "WS", "tentes"),
    ("Toiles tendues Zoo Rabat", "2025-03-11", "annule", "non", "WC", "stores"),
    ("Drapeaux ANCFCC", "2025-03-05", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Mers Sultan", "2024-12-23", "annule", "non", "WC", "pavoisement"),
    ("Stores Santé Tinghir", "2025-01-06", "annule", "non", "WS", "stores"),
    ("Bigues Bouskoura", "2024-12-12", "annule", "non", "WC", "fournitures"),
    ("Tentes Jeunesse Beni Mellal", "2024-12-09", "annule", "non", "WS", "tentes"),
    ("AO IAM Marrakech Stores", "2023-03-02", "annule", "non", "WC", "stores"),
    ("Tentes El Menzeh", "2024-12-03", "annule", "non", "WC", "tentes"),
    ("Dalots Bouskoura", "2024-12-12", "annule", "non", "WC", "travaux"),
    ("Pavoisement Salé", "2024-11-12", "annule", "non", "WS", "pavoisement"),
    ("Pavoisement Ain Chock", "2024-11-21", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Laayayda", "2024-11-21", "annule", "non", "WC", "pavoisement"),
    ("Stores Fédération de Football", "2024-06-25", "annule", "non", "WC", "stores"),
    ("Pavoisement Marrakech Annakhil", "2024-07-25", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Kénitra", "2024-06-25", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Commune Larache", "2024-06-12", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Commune Laayoune", "2024-06-21", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Commune Marrakech", "2024-05-28", "annule", "non", "WC", "pavoisement"),
    ("RADEMA ALU", "2024-02-22", "annule", "non", "WC", None),
    ("Tentes ADN - GRP & PC", "2024-01-17", "annule", "non", "WC", "tentes"),
    ("Stores Santé Kénitra", "2024-02-19", "annule", "non", "WC", "stores"),
    ("CNRST Stores", "2023-05-03", "annule", "non", "WC", "stores"),
    ("CNRST Stores", "2023-03-28", "annule", "non", "WC", "stores"),
    ("CP Skhirat Temara Barrières", "2023-09-08", "annule", "non", "WC", "fournitures"),
    ("Police Couchage", "2023-12-14", "annule", "non", "WC", "tentes"),
    ("Stores MHPV", "2023-09-22", "annule", "non", "WC", "stores"),
    ("Matériel des fêtes CPST", "2023-09-26", "annule", "non", "WC", "fournitures"),
    ("Parasols ONDA", "2023-08-24", "annule", "non", "WC", "fournitures"),
    ("Stores Tribunaux Marrakech", "2023-07-28", "annule", "non", "WC", "stores"),
    ("IAM Marrakech Toile Tendue", "2023-06-27", "annule", "non", "WC", "stores"),
    ("Cour d'Appel Tanger Cloison Alu", "2023-05-31", "annule", "non", "WC", "amenagement"),
    ("Pavoisement Ain Harrouda", "2023-05-15", "annule", "non", "WC", "pavoisement"),

    # Page 3
    ("Club Wifaq", "2023-05-08", "annule", "non", "WC", None),
    ("Douane Drapeaux", "2023-04-11", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Bouskoura", "2024-11-14", "annule", "non", "WC", "pavoisement"),
    ("Tentes Commune El Menzeh", "2024-11-14", "annule", "non", "WS", "tentes"),
    ("Dalots Bouskoura", "2024-11-14", "annule", "non", "WC", "travaux"),
    ("Stores DGI Tanger", "2024-10-31", "annule", "non", "WS", "stores"),
    ("Pavoisement SAFI", "2024-11-05", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Youssoufia", "2024-10-22", "annule", "non", "WS", "pavoisement"),
    ("Stores Douane Casa", "2024-10-22", "annule", "non", "WS", "stores"),
    ("Tentes protection civile", "2024-10-07", "annule", "non", "WS", "tentes"),
    ("Guérites Police Rabat", "2024-09-25", "annule", "non", "WS", "fournitures"),
    ("Drapeaux Justice", "2024-09-25", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Sidi Bernoussi", "2024-09-25", "annule", "non", "WC", "pavoisement"),
    ("Dalots Sidi Moumen", "2024-09-26", "annule", "non", "WS", "travaux"),
    ("Drapeaux Sidi Moumen", "2024-09-26", "annule", "non", "WS", "pavoisement"),
    ("Aménagement Marriott Rabat", "2024-09-09", "annule", "non", "WC", "amenagement"),
    ("Barrières Fkih Ben Saleh", "2024-08-06", "annule", "non", "WC", "fournitures"),
    ("Parasols Protection Civile", "2024-08-06", "annule", "non", "WC", "fournitures"),
    ("Drapeaux Douane", "2024-07-22", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Marrakech", "2024-07-01", "annule", "non", "WC", "pavoisement"),
    ("Stores Hydrocarbures", "2024-07-12", "annule", "non", "WC", "stores"),
    ("Barrières CP Rabat", "2024-06-20", "annule", "non", "WC", "fournitures"),
    ("Pavoisement Touarga", "2024-06-25", "annule", "non", "WC", "pavoisement"),
    ("Tentes Individuelles ADN", "2024-06-13", "annule", "non", "WC", "tentes"),
    ("Pavoisement Commune Tanger", "2024-05-29", "annule", "non", "WC", "pavoisement"),
    ("Marriott Uni", "2024-05-13", "annule", "non", "WC", "amenagement"),
    ("Pavoisement fête Commune Sidi Yahya", "2024-05-14", "annule", "non", "WC", "pavoisement"),
    ("Barrières Commune Tetouan", "2024-05-14", "annule", "non", "WC", "fournitures"),
    ("Tentes Jeunesse", "2024-06-11", "annule", "non", "WC", "tentes"),
    ("Barrières piètons Commune Tetouan", "2024-05-14", "annule", "non", "WC", "fournitures"),
    ("Pavoisement Commune Tetouan", "2024-05-07", "annule", "non", "WC", "pavoisement"),
    ("Fêtes et pavoisement Commune Tetouan", "2024-05-09", "annule", "non", "WC", "pavoisement"),
    ("Stores CRI Daraa Tafilalt", "2024-04-16", "annule", "non", "WC", "stores"),
    ("Pavoisement Oulad Frej", "2024-04-23", "annule", "non", "WC", "pavoisement"),
    ("Pavoisement Meknes", "2024-04-01", "annule", "non", "WC", "pavoisement"),
    ("Pergola Bioclimatique Barid Bank", "2024-03-27", "annule", "non", "WC", "amenagement"),
    ("Tentes Région Guelmim", "2024-04-16", "annule", "non", "WC", "tentes"),
    ("Pavoisement Marrakech Annakhil", "2024-03-26", "annule", "non", "WC", "pavoisement"),
    ("Barrières Tanger", "2024-03-27", "annule", "non", "WC", "fournitures"),
    ("ADN Tentes Individuelles 11SAMDII2024", "2024-03-19", "annule", "non", "WC", "tentes"),
    ("Salon Mariée Chambre d'artisanat", "2024-03-01", "annule", "non", "WC", "amenagement"),
    ("Stores BCP", "2024-03-04", "annule", "non", "WC", "stores"),
    ("Lits APR", "2024-02-13", "annule", "non", "WC", "tentes"),
    ("Stores Justice", "2024-01-30", "annule", "non", "WC", "stores"),
    ("Tentes ADN GRP & PC 38", "2024-01-17", "annule", "non", "WC", "tentes"),
    ("Stores Conseil de la Concurrence", "2024-01-19", "annule", "non", "WC", "stores"),
    ("Aménagement logement préfecture Mohammedia", "2023-12-12", "annule", "non", "WC", "amenagement"),
    ("Aménagement préfecture Mohammedia", "2023-12-13", "annule", "non", "WC", "amenagement"),
    ("Matériel des fêtes CPST", "2023-12-27", "annule", "non", "WC", "fournitures"),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 5- AO En Adjudication
    # ══════════════════════════════════════════════
    ("Couchage PC PR L7", "2025-08-19", "en_adjudication", "oui", "SL", "tentes"),
    ("AMI Tentes DGPC PF", "2026-01-30", "en_adjudication", "oui", "WC", "tentes"),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 6- Marchés en cours
    # ══════════════════════════════════════════════
    ("Lits de camp DGPC PF L1", "2026-04-02", "marche_en_cours", "oui", "SL", "tentes"),
    ("Tentes Bloc Médical DGPC", "2026-03-19", "marche_en_cours", "oui", "WCM", "tentes"),
    ("Kits Ustensiles PC PR L2", "2025-08-22", "marche_en_cours", "oui", "SL", "fournitures"),
    ("FPM Tentes PF", None, "marche_en_cours", "oui", "WC", "tentes"),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 7- Marché en garantie
    # ══════════════════════════════════════════════
    ("TV PC", "2025-09-30", "marche_en_garantie", "oui", "SL", "fournitures"),
    ("MADAEF Fes Vichy", "2024-07-17", "marche_en_garantie", "oui", "WC", None),

    # ══════════════════════════════════════════════
    # WE CONCEPT — 8- Marchés clôturés
    # ══════════════════════════════════════════════
    ("Couchage Couverture ADN L6", "2025-07-25", "marche_cloture", "oui", "WCM", "tentes"),
    ("Couchage PC", "2025-06-13", "marche_cloture", "oui", "WS", "tentes"),
    ("Tentes PC", "2025-07-17", "marche_cloture", "oui", "WS", "tentes"),
    ("Tentes ADN L3 (593)", "2025-07-28", "marche_cloture", "oui", "WCM", "tentes"),
    ("Tentes ADN", "2023-05-25", "marche_cloture", "oui", "WC", "tentes"),
    ("Tentes ADN L2", "2025-07-02", "marche_cloture", "oui", "SL", "tentes"),
    ("Pergola Marriott Rabat", "2023-04-11", "marche_cloture", "oui", "WC", "amenagement"),
    ("Stores Entraide Nationale Sidi Slimane", "2024-02-19", "marche_cloture", "oui", "WC", "stores"),
    ("BC ENCG Agadir", None, "marche_cloture", "oui", "WC", None),
    ("Tentes de groupe aviation ADN L2 (198)", "2024-12-20", "marche_cloture", "oui", "WCM", "tentes"),
    ("Mobilier Grande Piscine", "2025-06-24", "marche_cloture", "oui", "WC", "mobilier"),
    ("Marriott Fes", "2025-06-23", "marche_cloture", "oui", "WC", "amenagement"),
    ("ENCG Agadir", None, "marche_cloture", "oui", "WC", None),
    ("Agencement Terrasse Grill Marriott", "2023-11-27", "marche_cloture", "oui", "WC", "amenagement"),
    ("Pavoisement Commune Hay Mohammadi Casa", "2024-05-22", "marche_cloture", "oui", "WC", "pavoisement"),
    ("ANCFCC Drapeaux", None, "marche_cloture", "oui", "WC", "pavoisement"),
    ("Aménagement Cité Universitaire El Jadida", None, "marche_cloture", "oui", "WC", "amenagement"),
    ("Tentes ADN L5 (1081)", "2024-07-09", "marche_cloture", "oui", "WC", "tentes"),
    ("Tentes sinistre protection civile L2", "2024-11-14", "marche_cloture", "oui", "SL", "tentes"),
    ("Tentes ADN L3 (844)", "2024-06-26", "marche_cloture", "oui", "WCM", "tentes"),
    ("Parasols Police Rabat", "2024-08-05", "marche_cloture", "oui", "WC", "fournitures"),
    ("Tentes Jeunesse Taza", "2024-06-19", "marche_cloture", "oui", "SL", "tentes"),
    ("Travaux Marriott Fes", "2024-05-27", "marche_cloture", "oui", "WC", "travaux"),
    ("Fongible Sidi Yahya", "2024-05-14", "marche_cloture", "oui", "WC", "fournitures"),
    ("Stores Entraide nationale", "2023-12-11", "marche_cloture", "oui", "WC", "stores"),
    ("Stores Université Caddi Ayyad", "2023-12-06", "marche_cloture", "oui", "WC", "stores"),
    ("Pavoisement Meknes", "2023-12-11", "marche_cloture", "oui", "WC", "pavoisement"),
    ("Guerites Parasol Sureté Ourzazate", "2023-11-28", "marche_cloture", "oui", "WC", "fournitures"),
    ("Dépôt Mohammedia", "2023-09-19", "marche_cloture", "oui", "WC", None),
    ("ADN Tentes Lots 1 & 2", "2023-08-07", "marche_cloture", "oui", "WC", "tentes"),
    ("GIZ Toile tendue", "2023-06-19", "marche_cloture", "oui", "WC", "stores"),

    # ══════════════════════════════════════════════
    # AYOURIS — Marchés En Cours
    # ══════════════════════════════════════════════
    ("Interfaçage RNA", "2025-02-27", "marche_en_cours", "oui", "AYOURIS", "informatique"),
    ("ODCO Banque des projets", "2025-10-27", "marche_en_cours", "oui", "AYOURIS", "informatique"),

    # ══════════════════════════════════════════════
    # AYOURIS — Marchés Terminés
    # ══════════════════════════════════════════════
    ("Ministère de l'Habitat - Conventions", "2022-12-06", "marche_cloture", "oui", "AYOURIS", None),
    ("Ministère de l'Éco - Maintenance e-Learning", None, "marche_cloture", "oui", "AYOURIS", "informatique"),

    # ══════════════════════════════════════════════
    # AYOURIS — AO Sélection (en instance)
    # ══════════════════════════════════════════════
    ("AMI DGCT Gestion des Groupements Ruraux", "2026-07-06", "en_instance", None, "AYOURIS", "informatique"),
    ("TMA SI Ministère de l'Intérieur", "2026-07-15", "en_instance", None, "AYOURIS", "informatique"),
]


def main():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    inserted = 0
    skipped = 0

    for objet, date_limite, statut, decision, societe_hint, domaine in AOS:
        date_obj = None
        if date_limite:
            try:
                date_obj = datetime.fromisoformat(date_limite)
            except Exception:
                pass

        # Check for near-duplicates (same objet + date_limite)
        existing = session.query(AppelOffre).filter(
            AppelOffre.objet == objet,
            AppelOffre.date_limite == date_obj,
        ).first()

        if existing:
            print(f"SKIP (duplicate): {objet} / {date_limite}")
            skipped += 1
            continue

        ao = AppelOffre(
            objet=objet,
            date_limite=date_obj,
            statut=statut,
            decision=decision,
            domaine=domaine,
            notes=f"Import Drive — Société: {societe_hint}",
        )
        session.add(ao)
        inserted += 1
        print(f"INSERT: [{statut}] {objet} ({date_limite}) — {societe_hint}")

    session.commit()
    session.close()
    print(f"\nDone: {inserted} insérés, {skipped} ignorés (doublons)")


if __name__ == "__main__":
    main()
