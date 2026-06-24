/**
 * GAMME PRODIGE BOMBE — Rock Systems
 * ==============================================
 * Coulissant à dormant fortement bombé 6024V2 (2R) / 6063 (3R). Rail 6099BIS à L-87 mm.
 * Formules issues de l'abaque atelier D_bitage.pptx (Rock Systems).
 */

const { round1 } = require("../engine/coulissant");

const CONFIGS = {
  "2VT/2R": { vantaux:2, dormant:"6024V2", railQ:2, latQ:2, centrQ:2,  jonction:null,
              trav:L=>L/2-73.3,  travQ:4,  vitL:L=>L/2-85.7,  vitH:H=>H-164.2, vitQ:2, rails:2 },
  "3VT/2R": { vantaux:3, dormant:"6024V2", railQ:2, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-50,    travQ:6,  vitL:L=>L/3-62,    vitH:H=>H-164.2, vitQ:3, rails:2 },
  "3VT/3R": { vantaux:3, dormant:"6063",   railQ:3, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-50,    travQ:6,  vitL:L=>L/3-62,    vitH:H=>H-164.2, vitQ:3, rails:3 },
  "4VT/2R": { vantaux:4, dormant:"6024V2", railQ:2, latQ:4, centrQ:4,  jonction:H=>H-127, jonctionQ:1,
              trav:L=>L/4-56,    travQ:8,  vitL:L=>L/4-68.4,  vitH:H=>H-164.2, vitQ:4, rails:2 },
  "6VT/3R": { vantaux:6, dormant:"6063",   railQ:3, latQ:4, centrQ:8,  jonction:H=>H-127, jonctionQ:1,
              trav:L=>L/6-38,    travQ:12, vitL:L=>L/6-51,    vitH:H=>H-164.2, vitQ:6, rails:3 },
};

const TRAV_LABEL = {
  "2VT/2R":"(L/2) − 73,3", "3VT/2R":"(L/3) − 50",   "4VT/2R":"(L/4) − 56",
  "3VT/3R":"(L/3) − 50",   "6VT/3R":"(L/6) − 38",
};

const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
const MONT_REFS = ["6040-6057-6026-6027", "6042-6049-6028-6029V1"];
const REF_ORDER = ["6099BIS","6024V2","6063","6040-6057-6026-6027",
                   "6042-6049-6028-6029V1","6032","6044V1-6030BIS"];

function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c;
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  add("6099BIS",               "Rail",             "Droite",    "L − 87",              L-87,        a.railQ);
  add(a.dormant,               "Dormant — trav. haute", "Onglet 45°", "L",             L,           1);
  add(a.dormant,               "Dormant — trav. basse", "Onglet 45°", "L",             L,           1);
  add(a.dormant,               "Dormant — montant G",   "Onglet 45°", "H",             H,           1);
  add(a.dormant,               "Dormant — montant D",   "Onglet 45°", "H",             H,           1);
  add("6040-6057-6026-6027",   "Montant latéral",  "Droite",    "H − 71",              H-71,        a.latQ);
  add("6042-6049-6028-6029V1", "Montant central",  "Droite",    "H − 71",              H-71,        a.centrQ);
  if (a.jonction) add("6032", "Profil de jonction", "Droite", "H − 127", a.jonction(H), a.jonctionQ||1);
  add("6044V1-6030BIS",        "Traverse vantail", "Droite",    TRAV_LABEL[c.config],  a.trav(L),   a.travQ);

  return { chassis: c, lignes };
}

function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

function accessoiresChassis() { return []; }

module.exports = {
  id: "prodige_bombe",
  marque: "Rock Systems",
  gamme: "PRODIGE BOMBE",
  label: "PRODIGE BOMBE",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
