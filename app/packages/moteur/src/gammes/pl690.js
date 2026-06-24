/**
 * GAMME PL600/90 — Rock Systems
 * =========================================
 * Coulissant périmétral 90 mm. Dormant PL690.xx (2R/3R).
 * Formules issues de l'abaque atelier D_bitage.pptx (Rock Systems).
 */

const { round1 } = require("../engine/coulissant");

const CONFIGS = {
  "2VT/2R": { vantaux:2, dormant:"PL690.01", railQ:2, latQ:2, centrQ:2,  jonction:null,
              trav:L=>L/2-41,  travQ:4,  vitL:L=>L/2-100,  vitH:H=>H-174, vitQ:2, rails:2 },
  "3VT/2R": { vantaux:3, dormant:"PL690.01", railQ:2, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-15,  travQ:6,  vitL:L=>L/3-71,   vitH:H=>H-174, vitQ:3, rails:2 },
  "3VT/3R": { vantaux:3, dormant:"PL690.03", railQ:3, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-15,  travQ:6,  vitL:L=>L/3-71,   vitH:H=>H-174, vitQ:3, rails:3 },
  "4VT/2R": { vantaux:4, dormant:"PL690.01", railQ:2, latQ:4, centrQ:4,  jonction:H=>H-126, jonctionQ:1,
              trav:L=>L/4-24,  travQ:8,  vitL:L=>L/4-82,   vitH:H=>H-174, vitQ:4, rails:2 },
  "6VT/3R": { vantaux:6, dormant:"PL690.03", railQ:3, latQ:4, centrQ:8,  jonction:H=>H-126, jonctionQ:1,
              trav:L=>L/6-3,   travQ:12, vitL:L=>L/6-60,   vitH:H=>H-174, vitQ:6, rails:3 },
};

const TRAV_LABEL = {
  "2VT/2R":"(L/2) − 41", "3VT/2R":"(L/3) − 15", "4VT/2R":"(L/4) − 24",
  "3VT/3R":"(L/3) − 15", "6VT/3R":"(L/6) − 3",
};

const BARRE = { standard: 6030, montants: 6600, kerf: 5 };
const MONT_REFS = ["PL600.10-11", "PL600.20-21-22"];
const REF_ORDER = ["6099BIS","PL690.01","PL690.03","PL600.10-11",
                   "PL600.20-21-22","PL600.32","PL600.30"];

function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c;
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  add("6099BIS",          "Rail",             "Droite",    "L − 96",              L-96,         a.railQ);
  add(a.dormant,          "Dormant — trav. haute",  "Onglet 45°", "L",            L,            1);
  add(a.dormant,          "Dormant — trav. basse",  "Onglet 45°", "L",            L,            1);
  add(a.dormant,          "Dormant — montant G",    "Onglet 45°", "H",            H,            1);
  add(a.dormant,          "Dormant — montant D",    "Onglet 45°", "H",            H,            1);
  add("PL600.10-11",      "Montant latéral",  "Droite",    "H − 80",              H-80,         a.latQ);
  add("PL600.20-21-22",   "Montant central",  "Droite",    "H − 80",              H-80,         a.centrQ);
  if (a.jonction) add("PL600.32", "Profil de jonction", "Droite", "H − 126", a.jonction(H), a.jonctionQ||1);
  add("PL600.30",         "Traverse vantail", "Droite",    TRAV_LABEL[c.config],  a.trav(L),    a.travQ);

  return { chassis: c, lignes };
}

function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

function accessoiresChassis(c) {
  const a = CONFIGS[c.config], v = a.vantaux, Q = c.Q, acc = [];
  const add = (ref, des, qte, unite) => { if (qte > 0) acc.push({ ref, des, qte: qte*Q, unite }); };
  add("RS_0603", "Galet réglable simple 80 kg", 2*v, "unité");
  add("1303",    "Équerre à pion 36 x 10",      8,   "unité");
  add("BUT0195", "Butée pour coulissant",        2,   "unité");
  const kit = { 2:["KE_0620","Kit étanchéité 2 rails"],
                3:["KE_0621","Kit étanchéité 3 rails"] }[a.rails];
  if (kit) add(kit[0], kit[1], 1, "unité");
  return acc;
}

module.exports = {
  id: "pl690",
  marque: "Rock Systems",
  gamme: "PL600/90",
  label: "PL600/90",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
