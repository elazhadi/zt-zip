import json
import re
from typing import Any
import anthropic
from ..config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
MODEL = "claude-sonnet-4-6"

DAO_ANALYSIS_PROMPT = """Tu es un expert en marchés publics marocains (Décret 2-22-431).
Analyse ce document de dossier d'appel d'offres et extrais toutes les informations dans le JSON ci-dessous.
Si une information n'est pas trouvée, mets null.

Réponds UNIQUEMENT avec le JSON valide, sans texte autour.

{
  "reference": "numéro/référence de l'AO",
  "objet": "objet/intitulé complet du marché",
  "maitre_ouvrage": {
    "nom": "",
    "adresse": "",
    "ville": "",
    "type": ""
  },
  "date_limite": "YYYY-MM-DD HH:MM",
  "heure_limite": "HH:MM",
  "procedure": "appel d'offres ouvert|restreint|concours|bon de commande",
  "domaine": "domaine d'activité (fournitures/services/travaux/informatique...)",
  "reserve_tpme": false,
  "estimation": null,
  "lots": [
    {
      "numero": 1,
      "designation": "",
      "articles": [
        {
          "numero": 1,
          "designation": "",
          "specifications_techniques": "",
          "quantite": null,
          "unite": "",
          "marque_exigee": null,
          "norme": null,
          "certification": null
        }
      ]
    }
  ],
  "caution_provisoire": null,
  "delai_execution": {"valeur": null, "unite": "jours|mois"},
  "delai_garantie": {"valeur": null, "unite": "mois|ans"},
  "lieu_realisation": "",
  "marque_specifique": {"exigee": false, "details": ""},
  "prospectus_exige": false,
  "echantillon_exige": false,
  "tete_de_serie": false,
  "offre_technique_exigee": false,
  "criteres_notation": [
    {"critere": "", "poids": null, "details": ""}
  ],
  "notation_technique": {
    "seuil_elimination": null,
    "note_maximale": null
  },
  "structure_offre": {
    "dossier_administratif": [],
    "dossier_technique": [],
    "offre_financiere": []
  },
  "tva": 20,
  "caution_provisoire_calcul": "1.5% estimation"
}

Document DAO:
"""

PRICE_DISTRIBUTION_PROMPT = """Tu es un expert en prix de marchés publics marocains.

Répartis le montant HT total de {montant_ht} DH sur les articles du bordereau des prix.
Respecte les règles suivantes :
1. La somme de (prix_unitaire × quantité) pour tous les articles doit EXACTEMENT égaler {montant_ht} DH
2. Les prix unitaires doivent être arrondis au centime (2 décimales)
3. Respecte les proportions relatives entre articles selon leur désignation, quantité, et complexité
4. Dernier article : ajuste le prix pour que la somme soit EXACTE

Articles :
{articles_json}

Réponds UNIQUEMENT avec ce JSON valide :
{
  "articles": [
    {
      "numero": 1,
      "designation": "...",
      "quantite": X,
      "unite": "...",
      "prix_unitaire": X.XX,
      "montant": X.XX
    }
  ],
  "total_ht": {montant_ht},
  "verification": "OK"
}
"""

ATTESTATION_EXTRACTION_PROMPT = """Extrais les informations de cette attestation de référence de marché public.
Réponds UNIQUEMENT avec le JSON suivant :
{
  "activite": "objet/activité du marché",
  "client": "nom du maître d'ouvrage",
  "montant_ht": null,
  "montant_ttc": null,
  "periode_debut": "YYYY-MM-DD ou texte",
  "periode_fin": "YYYY-MM-DD ou texte",
  "numero_marche": "",
  "lieu": ""
}

Document :
"""

PROSPECTUS_CONFORMITY_PROMPT = """Tu es un expert en conformité de prospectus pour marchés publics marocains.

Spécifications techniques du CPS/RC :
{specs_cps}

Contenu du prospectus fourni :
{prospectus_content}

Analyse article par article la conformité du prospectus et génère un rapport au format JSON :
{
  "score_global": 85,
  "nb_conforme": 5,
  "nb_manquant": 1,
  "nb_non_conforme": 1,
  "items": [
    {
      "type": "conforme|manquant|non_conforme",
      "critere": "Dimensions",
      "detail_cps": "1200x600mm requis",
      "detail_prospectus": "1200x600mm mentionné",
      "commentaire": ""
    }
  ],
  "points_a_corriger": ["..."]
}
"""


def analyse_dao(text: str) -> dict:
    prompt = DAO_ANALYSIS_PROMPT + text[:50000]
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def distribute_prices(articles: list, montant_ht: float) -> dict:
    articles_json = json.dumps(articles, ensure_ascii=False, indent=2)
    prompt = PRICE_DISTRIBUTION_PROMPT.format(
        montant_ht=montant_ht,
        articles_json=articles_json
    )
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    result = json.loads(raw)

    # Ensure exact sum
    articles_out = result["articles"]
    total = sum(round(a["prix_unitaire"] * a["quantite"], 2) for a in articles_out)
    if abs(total - montant_ht) > 0.01 and articles_out:
        diff = montant_ht - total
        last = articles_out[-1]
        adjusted_montant = round(last["montant"] + diff, 2)
        last["montant"] = adjusted_montant
        if last["quantite"] > 0:
            last["prix_unitaire"] = round(adjusted_montant / last["quantite"], 2)
    result["total_ht"] = montant_ht
    return result


def extract_attestation_info(text: str) -> dict:
    prompt = ATTESTATION_EXTRACTION_PROMPT + text[:10000]
    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def check_prospectus_conformity(specs_cps: str, prospectus_content: str) -> dict:
    prompt = PROSPECTUS_CONFORMITY_PROMPT.format(
        specs_cps=specs_cps[:5000],
        prospectus_content=prospectus_content[:5000]
    )
    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def generate_prospectus_content(specs_cps: str, prompt_rectification: str = "") -> str:
    system = "Tu génères un prospectus commercial professionnel pour un appel d'offres public marocain."
    user_prompt = f"""Génère un prospectus complet respectant 100% des spécifications suivantes :

{specs_cps[:5000]}

{f"Modifications demandées : {prompt_rectification}" if prompt_rectification else ""}

Génère un prospectus détaillé en français, structuré avec toutes les caractéristiques techniques requises.
"""
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": user_prompt}]
    )
    return message.content[0].text


def translate_specs_to_english(specs: str) -> str:
    prompt = f"Translate these technical specifications from French to English for a supplier:\n\n{specs}"
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text


def analyse_resultats_image(image_base64: str, media_type: str = "image/jpeg") -> dict:
    prompt = """Tu es un expert en marchés publics marocains (Décret n° 2-22-431).

Analyse cette capture d'écran de page de résultats d'un appel d'offres et extrais les informations suivantes en JSON valide uniquement, sans texte autour.

Règles du Décret 2-22-431 pour le mieux disant :
- L'offre la moins disante ADMISSIBLE est retenue (prix le plus bas parmi les soumissionnaires non écartés)
- Un soumissionnaire peut être écarté si son offre est anormalement basse (< 25% de l'estimation) ou techniquement non conforme
- Le classement est par ordre croissant de prix (offres admises uniquement)

JSON à retourner :
{
  "objet": "intitulé du marché",
  "maitre_ouvrage": "nom du maître d'ouvrage",
  "date_seance": "date de la séance d'ouverture (YYYY-MM-DD ou texte)",
  "estimation_mo": null,
  "concurrents": [
    {
      "rang": 1,
      "nom": "nom du concurrent",
      "offre_ht": 0.0,
      "pct_estimation": 0.0,
      "statut": "admis"
    }
  ],
  "mieux_disant": {
    "nom": "nom du mieux disant",
    "offre_ht": 0.0,
    "pct_estimation": 0.0
  },
  "notes": "observations éventuelles"
}

Instructions :
- Trie les concurrents par offre croissante (mieux disant en rang 1)
- Calcule pct_estimation = (offre_ht / estimation_mo * 100) si estimation disponible, sinon null
- statut: "admis" ou "ecarte" selon ce qui est indiqué dans le document
- Si l'estimation n'est pas visible, mets null
- Si un montant contient des espaces ou points comme séparateurs de milliers, convertis en nombre"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64,
                    }
                },
                {"type": "text", "text": prompt}
            ]
        }]
    )
    text = message.content[0].text.strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def recommander_offre(historique: list, estimation: float, domaine: str = "") -> dict:
    if not historique:
        return {"pct_recommande": 92.0, "confiance": "faible", "explication": "Aucun historique disponible."}

    rows = []
    for r in historique:
        for c in (r.get("concurrents") or []):
            if c.get("statut") == "admis" and c.get("pct_estimation"):
                rows.append({
                    "nom": c.get("nom", ""),
                    "pct": c.get("pct_estimation"),
                    "rang": c.get("rang"),
                    "gagnant": c.get("rang") == 1,
                })

    prompt = f"""Tu es un expert en marchés publics marocains. Voici l'historique des résultats d'appels d'offres similaires :

Domaine : {domaine or 'non précisé'}
Estimation MO actuelle : {estimation:,.0f} DH

Historique des offres (% par rapport à l'estimation MO) :
{json.dumps(rows[:50], ensure_ascii=False, indent=2)}

En te basant sur cet historique et les pratiques du marché marocain :
1. Quel pourcentage de l'estimation recommandes-tu pour être compétitif tout en restant rentable ?
2. Quelle est la fourchette habituelle des offres gagnantes ?
3. Y a-t-il des concurrents récurrents à surveiller ?

Réponds en JSON uniquement :
{{
  "pct_recommande": 94.5,
  "fourchette_min": 88.0,
  "fourchette_max": 97.0,
  "confiance": "élevée|moyenne|faible",
  "concurrents_frequents": ["nom1", "nom2"],
  "explication": "explication courte"
}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    text = message.content[0].text.strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except Exception:
        return {"pct_recommande": 92.0, "confiance": "faible", "explication": text}


def adapt_htm_note(base_htm: str, ao_context: str) -> str:
    prompt = f"""Adapte cette note de moyens humains et techniques (HTM) pour cet appel d'offres spécifique.
Garde la structure mais personnalise le contenu selon le contexte du marché.

Note HTM de base :
{base_htm[:3000]}

Contexte AO :
{ao_context[:2000]}

Génère une note HTM adaptée en DOCX-compatible (texte structuré) :"""
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text
