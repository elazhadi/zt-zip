/**
 * TEMPLATE — Définition d'une nouvelle gamme
 * ==========================================
 * Copier ce fichier en gammes/<id>.js, le remplir avec l'ABAQUE ATELIER réel de
 * la gamme, puis l'enregistrer (voir AJOUTER_UNE_GAMME.md).
 *
 * ⚠️ RÈGLE ABSOLUE : toutes les formules ci-dessous doivent venir de l'abaque
 * atelier (manuel de fabrication ou exports ProGES) de la gamme. NE JAMAIS
 * extrapoler depuis les sections du catalogue ou une autre gamme. Pas d'abaque
 * = pas de gamme : c'est volontaire, pour ne pas gâcher de barres.
 *
 * Ce fichier n'est PAS enregistré (préfixe `_`). Il sert de modèle uniquement.
 */

const { round1 } = require("../engine/coulissant");

// 1) ABAQUE : une entrée par configuration, formules de coupe en fonction de L/H.
//    Remplacer par les valeurs réelles de l'abaque de la gamme.
const CONFIGS = {
  // "2VT/2R": { vantaux:2, dormant:"REF_DORMANT", railQ:2, latQ:2, centrQ:2,
  //             jonction:null,                       // ou H => H - X, avec jonctionQ
  //             trav:L=>L/2-?,  travQ:4,
  //             vitL:L=>L/2-?,  vitH:H=>H-?, vitQ:2, rails:2 },
};

// 2) Étiquettes lisibles des formules de traverse (affichage).
const TRAV_LABEL = {
  // "2VT/2R": "(L/2) − ?",
};

// 3) Paramètres de mise en barre de la gamme.
const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
// Profilés débités sur la barre « montants » (longueur différente). Vide si N/A.
const MONT_REFS = [];
// Ordre d'affichage des profilés.
const REF_ORDER = [];

// 4) Débitage d'un châssis — adapter la recette à la structure réelle de la gamme.
function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c; // eslint-disable-line no-unused-vars
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  // Exemple de structure (à remplacer par la recette réelle de la gamme) :
  // add("REF_RAIL", "Rail", "Droite", "L − X", L - X, a.railQ);
  // ...

  return { chassis: c, lignes };
}

// 5) Vitrage d'un châssis.
function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

// 6) Accessoires d'un châssis (déductions à faire valider par l'atelier).
function accessoiresChassis(c) {
  const acc = [];
  // const add = (ref, des, qte, unite) => { if (qte > 0) acc.push({ ref, des, qte: qte*c.Q, unite }); };
  // add("REF_GALET", "Galet", 2 * CONFIGS[c.config].vantaux, "unité");
  return acc;
}

module.exports = {
  id: "TEMPLATE",                 // identifiant unique (slug), ex. "s70p"
  marque: "MARQUE",               // ex. "Strugal"
  gamme: "GAMME",                 // ex. "S70P"
  label: "MARQUE — GAMME",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
