import json
import re
from typing import Any
import anthropic
from ..config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
MODEL = "claude-sonnet-4-6"

DAO_ANALYSIS_PROMPT = """Tu es un expert en marchés publics marocains (Décret 2-22-431).
Analyse ces documents de dossier d'appel d'offres et extrais TOUTES les informations dans le JSON ci-dessous.
Si une information n'est pas trouvée, mets null.

INSTRUCTIONS CRITIQUES — lis attentivement chaque point :

1. RÉFÉRENCE : cherche "N°..." ou "numéro..." dans l'avis ou l'entête du CPS/RC. Inclure la société ou l'organisme dans le numéro si présent.

2. DATE ET HEURE LIMITE : dans l'avis, cherche "il sera procédé le...", "date et heure limite de remise des plis", ou "ouverture des plis". Extrais la date ET l'heure exacte (HH:MM). Format strict : "YYYY-MM-DD HH:MM". Si heure inconnue, mets "10:00" par défaut.

3. ESTIMATION MO : dans l'avis, cherche "l'estimation des coûts établie par le maître d'ouvrage" ou "montant estimatif". C'est le montant TTC. Convertis obligatoirement le texte en nombre entier (ex: "cinquante-six millions six cent quatre-vingt-dix-neuf mille" → 56699000). Ne pas mettre de virgules ni points dans le JSON, juste le nombre.

4. CAUTION PROVISOIRE : dans l'avis ou RC, cherche "cautionnement provisoire est fixé à". Convertis en nombre entier.

5. DÉLAI D'EXÉCUTION : cherche dans le CPS l'article intitulé "DELAI D'EXECUTION" (souvent Article 10 ou Article 9). Exemple : "Le délai global d'exécution est fixé à 90 (quatre-vingt-dix) jours". Extrais valeur (90) et unite ("jours"). Si c'est en mois, unite = "mois".

6. DÉLAI DE GARANTIE : cherche "délai de garantie" ou "retenue de garantie" dans le CPS. Extrais valeur et unité (mois ou ans).

7. BORDEREAU DES PRIX - DETAIL ESTIMATIF : cherche le tableau "BORDEREAU DES PRIX" ou "B.P.D.E". C'est un tableau avec colonnes : N°, Désignation, Qté, Unité, P.U., Montant. Extrais ABSOLUMENT TOUS les articles :
   - numero : entier (1, 2, 3...) ou sous-numéro comme "1.1"
   - designation : libellé COMPLET de la prestation ou fourniture
   - quantite : la valeur numérique (null si forfaitaire ou non précisé)
   - unite : l'unité (U, m², ml, F, FT, lot, ens, kg...)
   - specifications_techniques : caractéristiques techniques issues du CPS pour cet article (dimensions, normes, matériaux...)
   - marque_exigee : marque si explicitement exigée, sinon null
   Si le bordereau n'a qu'une seule ligne globale, mets-la quand même.

8. LOTS : si l'AO est divisé en lots, crée un objet lot par lot avec ses articles. Sinon, crée un unique lot numéroté 1 avec comme désignation l'objet du marché, et liste tous les articles dedans.

9. MAÎTRE D'OUVRAGE : nom complet de l'organisme commanditaire, adresse, ville, type (ministère/collectivité/établissement public...).

10. PROCÉDURE : "appel d'offres ouvert" (le plus courant), "restreint", "concours", ou "bon de commande".

11. RÉSERVÉ TPME : true si le document mentionne explicitement "réservé à la TPE et PME", "réservé aux jeunes entreprises innovantes" ou équivalent.

12. PROSPECTUS EXIGÉ : true si le RC mentionne le dépôt obligatoire de prospectus/documentation technique.

13. OFFRE TECHNIQUE EXIGÉE : true si le dossier de consultation prévoit un dossier technique noté séparément.

14. CRITÈRES DE NOTATION : si offre technique, liste chaque critère avec son poids (%).

Réponds UNIQUEMENT avec le JSON valide ci-dessous, sans texte autour, sans markdown.

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
  "procedure": "appel d'offres ouvert|restreint|concours|bon de commande",
  "domaine": "fournitures|services|travaux|informatique",
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
  "delai_execution": {"valeur": null, "unite": "jours"},
  "delai_garantie": {"valeur": null, "unite": "mois"},
  "lieu_realisation": "",
  "marque_specifique": {"exigee": false, "details": ""},
  "prospectus_exige": false,
  "echantillon_exige": false,
  "tete_de_serie": false,
  "offre_technique_exigee": false,
  "criteres_notation": [],
  "notation_technique": {
    "seuil_elimination": null,
    "note_maximale": null
  },
  "tva": 20
}

Documents DAO :
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


HISTORIQUE_PROMPT = """Tu es un expert en marchés publics marocains (Décret 2-22-431).
Ce dossier archivé contient les documents d'un AO : RC, CPS, CTP, offre, BPU, DPGF,
PV de dépouillement, notification de marché, OS, PV de réception, correspondances, etc.

Analyse TOUS les documents et remplis le JSON ci-dessous. Si une info est introuvable → null.

Règles pour "statut" :
- "cloture"                  : PV réception définitive OU attestation bonne exécution présents
- "en_garantie"              : PV réception provisoire présent, sans réception définitive
- "marche_en_cours"          : notification marché / OS présent, exécution en cours
- "en_attente_de_resultats"  : PV dépouillement présent, pas encore de notification
- "perdu"                    : PV mentionne un attributaire ≠ notre société
- "en_instance"              : par défaut, statut incertain

Règles pour "decision" : "oui" si offre/soumission trouvée, sinon "non"

Réponds UNIQUEMENT avec ce JSON valide, sans texte autour :
{
  "reference": "numéro/référence de l'AO",
  "objet": "objet/intitulé complet du marché",
  "maitre_ouvrage": {"nom": "", "adresse": "", "ville": "", "type": ""},
  "date_limite": "YYYY-MM-DD HH:MM ou null",
  "procedure": "appel d'offres ouvert|restreint|concours|bon de commande",
  "domaine": "domaine d'activité",
  "reserve_tpme": false,
  "estimation": null,
  "lots": [],
  "caution_provisoire": null,
  "delai_execution": {"valeur": null, "unite": "jours|mois"},
  "statut": "cloture|en_garantie|marche_en_cours|en_attente_de_resultats|perdu|en_instance",
  "decision": "oui|non",
  "montant_marche_ht": null,
  "numero_marche": null,
  "notes_import": "résumé bref de ce qui a été trouvé dans le dossier"
}

Documents du dossier :
"""


def analyse_historique(text: str) -> dict:
    prompt = HISTORIQUE_PROMPT + text[:60000]
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def analyse_historique_images(images_b64: list[str]) -> dict:
    content = []
    for img_b64 in images_b64[:15]:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img_b64}})
    content.append({"type": "text", "text": HISTORIQUE_PROMPT + "(Document sous forme d'images de pages PDF scannées)"})
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": content}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def analyse_dao_images(images_b64: list[str]) -> dict:
    """Analyse DAO from PDF page images (scanned PDF) using Claude Vision."""
    content = []
    for img_b64 in images_b64[:20]:
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": img_b64}
        })
    content.append({
        "type": "text",
        "text": DAO_ANALYSIS_PROMPT + "(Document fourni sous forme d'images de pages PDF scannées)"
    })
    message = client.messages.create(
        model=MODEL,
        max_tokens=8192,
        messages=[{"role": "user", "content": content}]
    )
    raw = message.content[0].text.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def analyse_dao(text: str) -> dict:
    prompt = DAO_ANALYSIS_PROMPT + text[:120000]
    message = client.messages.create(
        model=MODEL,
        max_tokens=8192,
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
