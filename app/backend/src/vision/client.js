const Anthropic = require("@anthropic-ai/sdk");
const moteur = require("@ulysse70/moteur");

// Prompt système — repris de PROMPT_VISION.md (spécification de l'appel vision).
const SYSTEM_PROMPT = `Tu es un assistant de saisie pour un comptoir de menuiserie aluminium.
On te donne la photo (ou le PDF) d'un croquis de châssis coulissant(s).
Ta tâche : extraire les informations de chaque châssis dessiné, sans rien inventer.

Pour chaque châssis identifiable, extrais :
- la marque / gamme imprimée à côté du châssis (ex. "PL600", "ULYSSE 70",
  "PL500", "PL600/90", "PRODIGE", "ÉMERAUDE") — recopie le texte tel quel
- largeur L en mm (la cote horizontale totale)
- hauteur H en mm (la cote verticale totale)
- nombre de vantaux si visible (compte les panneaux dessinés ; un libellé
  "2 Vantaux" donne directement le nombre)
- nombre de rails si indiqué (souvent noté "2 rails", "3 rails", ou par le type)
- quantité si indiquée (ex. "x2", "2 pièces", "Quantité : 3")
- toute autre cote ou annotation lisible

Règles strictes :
- Ne devine JAMAIS une cote absente. Si une valeur n'est pas lisible, mets null.
- Pour les rails : si le croquis ne précise pas le nombre de rails, mets null
  (ne l'invente pas). Le backend appliquera les règles d'atelier.
- Donne un indice de confiance (0 à 1) par châssis et par cote clé.
- Les cotes sont en millimètres. Si tu vois une valeur < 100, c'est probablement
  des centimètres ou une cote partielle : signale-le, ne convertis pas toi-même.
- Réponds UNIQUEMENT en JSON valide, sans texte autour, sans balises Markdown.`;

const USER_PROMPT = `Analyse ce croquis et renvoie le JSON structuré décrit, au format :
{
  "chassis": [
    {
      "gamme_texte": string|null,
      "largeur_mm": number|null, "hauteur_mm": number|null,
      "vantaux": number|null, "rails": number|null, "quantite": number|null,
      "confiance": { "largeur": number, "hauteur": number, "vantaux": number, "rails": number },
      "config_suggeree": string|null, "annotations": string|null
    }
  ],
  "avertissements": [ string ]
}`;

const CONFIGS_CONNUES = new Set([
  "2VT/2R", "3VT/2R", "4VT/2R", "3VT/3R", "6VT/3R", "4VT/4R", "8VT/4R",
]);

// Reconnaissance marque/gamme : texte du croquis → identifiant moteur.
// Ordre = du plus spécifique au plus général (PL600/90 et PL690 AVANT PL600,
// SEMI-BOMBE avant BOMBE) pour lever les ambiguïtés.
const GAMME_ALIASES = [
  { id: "pl690",               patterns: [/\bPL\s*690\b/i, /\bPL\s*600\s*\/\s*90\b/i] },
  { id: "ulysse_pl500",        patterns: [/\bPL\s*500\b/i] },
  { id: "ulysse70",            patterns: [/\bULYSSE\s*70\b/i, /\bPL\s*600\b/i] },
  { id: "prodige_5020",        patterns: [/\b5020\b/i] },
  { id: "prodige_semibombe",   patterns: [/\bSEMI[\s-]?BOMB\w*/i] },
  { id: "prodige_bombe",       patterns: [/\bBOMB\w*/i] },
  { id: "prodige_purligne",    patterns: [/\bPUR[\s-]?LI(?:GN|N)E\b/i, /\bPURLINE\b/i] },
  { id: "emeraude_coulissant", patterns: [/[EÉ]MERAUDE/i] },
];

// Identifiants de gammes réellement disponibles dans le moteur.
function knownGammeIds() {
  try { return new Set(moteur.listeGammes().map((g) => g.id)); }
  catch (_) { return new Set(); }
}

// Mappe un texte de croquis vers un identifiant de gamme connu (ou null).
function mapGamme(text) {
  if (!text) return null;
  const ids = knownGammeIds();
  for (const { id, patterns } of GAMME_ALIASES) {
    if (!ids.has(id)) continue;
    if (patterns.some((re) => re.test(text))) return id;
  }
  return null;
}

// Configurations valides pour une gamme donnée (ou jeu coulissant par défaut).
function configsForGamme(id) {
  if (!id) return CONFIGS_CONNUES;
  try { return new Set(moteur.getGamme(id).configIds); }
  catch (_) { return CONFIGS_CONNUES; }
}

// Déduit le nombre de rails quand il n'est pas indiqué. Règle d'atelier non
// ambiguë : un coulissant à 2 vantaux est TOUJOURS à 2 rails. Pour 3/4 vantaux
// le nombre de rails reste ambigu → on ne déduit rien (null).
function inferRails(vantaux, rails) {
  if (rails) return rails;
  if (vantaux === 2) return 2;
  return null;
}

// Propose une config à partir de vantaux/rails (cf. PROMPT_VISION § mapping).
function mapConfig(vantaux, rails) {
  if (!vantaux || !rails) return null;
  const c = `${vantaux}VT/${rails}R`;
  return CONFIGS_CONNUES.has(c) ? c : null;
}

// Déduit la config d'un châssis frappe PL500 depuis le texte du croquis.
// Exemples ProGES : "Oscillo-battant PL500.07 CLASSIQUE", "Remplissage fixe PL500".
function mapConfigFrappe(gamme, text) {
  if (gamme !== "ulysse_pl500" || !text) return null;
  if (/oscillo|battant/i.test(text)) {
    if (/PL500\.07|porte/i.test(text)) return "PORTE-OB-1VT";
    if (/PL500\.06/i.test(text))       return "FEN-OB-1VT";
  }
  if (/remplissage|fixe/i.test(text))  return "FEN-FIXE";
  if (/soufflet/i.test(text))          return "FEN-SOUFFLET";
  if (/porte/i.test(text))             return "PORTE-OF-1VT";
  return null;
}

// Récupère les objets complets d'un tableau JSON éventuellement tronqué.
// Utile quand la réponse du modèle est coupée (max_tokens) au milieu du
// tableau "chassis" : on conserve les châssis entiers déjà lus.
function salvageArrayObjects(text, key) {
  const keyIdx = text.indexOf(`"${key}"`);
  if (keyIdx < 0) return null;
  const arrStart = text.indexOf("[", keyIdx);
  if (arrStart < 0) return null;

  const objects = [];
  let depth = 0, objStart = -1, inStr = false, esc = false;
  for (let i = arrStart + 1; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) objStart = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try { objects.push(JSON.parse(text.slice(objStart, i + 1))); } catch (_) { /* objet incomplet — on arrête */ }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break; // fin normale du tableau
    }
  }
  return objects;
}

// Parse la réponse JSON du modèle. Robuste au bavardage Markdown ET aux
// réponses tronquées (récupère alors les châssis complets).
function parseJsonLoose(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (_2) { /* tombe sur le salvage */ }
    }
    // Dernier recours : réponse tronquée — on récupère les châssis complets.
    const chassis = salvageArrayObjects(trimmed, "chassis");
    if (chassis && chassis.length) {
      return {
        chassis,
        avertissements: ["Réponse de lecture tronquée : certains châssis en fin de croquis peuvent manquer. Vérifiez la liste."],
      };
    }
    throw new Error("Réponse vision non parsable en JSON");
  }
}

// Crée un client vision. Si pas de clé API, renvoie null (endpoint répondra 503).
// Un client injecté (tests) court-circuite l'appel réseau.
function createVisionClient(opts = {}) {
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  const model = opts.model || process.env.VISION_MODEL || "claude-opus-4-8";
  if (opts.callModel) {
    return { model, _callModel: opts.callModel, available: true };
  }
  if (!apiKey) return null;
  const anthropic = new Anthropic({ apiKey });
  return {
    model,
    available: true,
    _callModel: async ({ mediaType, base64 }) => {
      const contentBlock = mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image",    source: { type: "base64", media_type: mediaType,          data: base64 } };
      const resp = await anthropic.messages.create({
        model,
        // Un croquis peut comporter de nombreux châssis (chacun produit un objet
        // JSON détaillé). 2048 tokens étaient insuffisants → réponse tronquée.
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [ contentBlock, { type: "text", text: USER_PROMPT } ],
          },
        ],
      });
      if (resp.stop_reason === "refusal") {
        throw new Error("Le modèle de vision a refusé de traiter l'image");
      }
      const textBlock = resp.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "";
    },
  };
}

// Lit un croquis : appelle le modèle, parse, enrichit config_suggeree côté backend.
async function lireCroquis(client, { mediaType, base64 }) {
  const raw = await client._callModel({ mediaType, base64 });
  const data = parseJsonLoose(raw);
  const chassis = Array.isArray(data.chassis) ? data.chassis : [];
  const avertissements = Array.isArray(data.avertissements) ? [...data.avertissements] : [];

  const gammeLabels = {};
  try { for (const g of moteur.listeGammes()) gammeLabels[g.id] = g.label; } catch (_) { /* moteur indispo */ }

  for (const c of chassis) {
    // 1. Reconnaissance de la marque / gamme depuis le texte du croquis.
    c.gamme = mapGamme(c.gamme_texte || c.marque || c.gamme || "");
    c.gamme_label = c.gamme ? (gammeLabels[c.gamme] || c.gamme) : null;

    // 2. Déduction des rails non précisés (2 vantaux ⇒ 2 rails) et report
    //    de la valeur déduite sur le châssis pour l'affichage.
    const rails = inferRails(c.vantaux, c.rails);
    if (rails && !c.rails) c.rails = rails;

    // 3. Config : si le modèle n'a rien proposé, on la déduit ; on la valide
    //    contre les configurations réelles de la gamme reconnue.
    const validConfigs = configsForGamme(c.gamme);
    // Pour les gammes à frappe (PL500…), inférer depuis le texte du croquis.
    const frappe = mapConfigFrappe(c.gamme, c.gamme_texte || "");
    const proposed = c.config_suggeree || frappe || mapConfig(c.vantaux, rails);
    if (proposed && !validConfigs.has(proposed)) {
      avertissements.push(`Config "${proposed}" non reconnue pour cette gamme — laissée vide.`);
      c.config_suggeree = null;
    } else {
      c.config_suggeree = proposed || null;
    }
  }

  return { chassis, avertissements };
}

module.exports = { createVisionClient, lireCroquis, mapConfig, mapConfigFrappe, mapGamme, inferRails, parseJsonLoose, SYSTEM_PROMPT };
