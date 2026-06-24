/**
 * GAMME ÉMERAUDE Coulissant — Rock Systems
 * ====================================================
 * Coulissant à dormant MD366 (2R) / MD363 (3R). Rail RAIL70 à L-80 mm.
 * Formules issues de l'abaque atelier D_bitage.pptx (Rock Systems).
 */

const { round1 } = require("../engine/coulissant");

const CONFIGS = {
  "2VT/2R": { vantaux:2, dormant:"MD366", railQ:2, latQ:2, centrQ:2,  jonction:null,
              trav:L=>L/2-27,   travQ:4,  vitL:L=>L/2-82,    vitH:H=>H-144.8, vitQ:2, rails:2 },
  "3VT/2R": { vantaux:3, dormant:"MD366", railQ:2, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-6,    travQ:6,  vitL:L=>L/3-60,    vitH:H=>H-144.8, vitQ:3, rails:2 },
  "3VT/3R": { vantaux:3, dormant:"MD363", railQ:3, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-8,    travQ:6,  vitL:L=>L/3-62,    vitH:H=>H-144.8, vitQ:3, rails:3 },
  "4VT/2R": { vantaux:4, dormant:"MD366", railQ:2, latQ:4, centrQ:4,  jonction:H=>H-116, jonctionQ:1,
              trav:L=>L/4-14,   travQ:8,  vitL:L=>L/4-69,    vitH:H=>H-144.8, vitQ:4, rails:2 },
  "6VT/3R": { vantaux:6, dormant:"MD363", railQ:3, latQ:4, centrQ:8,  jonction:H=>H-116, jonctionQ:1,
              trav:L=>L/6+4,    travQ:12, vitL:L=>L/6-53,    vitH:H=>H-144.8, vitQ:6, rails:3 },
};

const TRAV_LABEL = {
  "2VT/2R":"(L/2) − 27", "3VT/2R":"(L/3) − 6",    "4VT/2R":"(L/4) − 14",
  "3VT/3R":"(L/3) − 8",  "6VT/3R":"(L/6) + 4",
};

const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
const MONT_REFS = ["MD333-MD335", "MD343-MD340-MD345-MD346"];
const REF_ORDER = ["RAIL70","MD366","MD363","MD333-MD335",
                   "MD343-MD340-MD345-MD346","MD399","MD353"];

function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c;
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  add("RAIL70",                    "Rail",             "Droite",    "L − 80",             L-80,       a.railQ);
  add(a.dormant,                   "Dormant — trav. haute", "Onglet 45°", "L",            L,          1);
  add(a.dormant,                   "Dormant — trav. basse", "Onglet 45°", "L",            L,          1);
  add(a.dormant,                   "Dormant — montant G",   "Onglet 45°", "H",            H,          1);
  add(a.dormant,                   "Dormant — montant D",   "Onglet 45°", "H",            H,          1);
  add("MD333-MD335",               "Montant latéral",  "Droite",    "H − 64",             H-64,       a.latQ);
  add("MD343-MD340-MD345-MD346",   "Montant central",  "Droite",    "H − 64",             H-64,       a.centrQ);
  if (a.jonction) add("MD399", "Profil de jonction", "Droite", "H − 116", a.jonction(H), a.jonctionQ||1);
  add("MD353",                     "Traverse vantail", "Droite",    TRAV_LABEL[c.config], a.trav(L),  a.travQ);

  return { chassis: c, lignes };
}

function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

function accessoiresChassis() { return []; }

module.exports = {
  id: "emeraude_coulissant",
  marque: "Rock Systems",
  gamme: "ÉMERAUDE Coulissant",
  label: "ÉMERAUDE Coulissant",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
