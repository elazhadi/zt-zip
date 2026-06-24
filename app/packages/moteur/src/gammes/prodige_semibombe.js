/**
 * GAMME PRODIGE SEMI-BOMBE — Rock Systems
 * ===================================================
 * Coulissant à dormant bombé 6071BIS (2R) / 6073BIS (3R). Rail 6099BIS à L-86 mm.
 * Formules issues de l'abaque atelier D_bitage.pptx (Rock Systems).
 */

const { round1 } = require("../engine/coulissant");

const CONFIGS = {
  "2VT/2R": { vantaux:2, dormant:"6071BIS", railQ:2, latQ:2, centrQ:2,  jonction:null,
              trav:L=>L/2-72.3,  travQ:4,  vitL:L=>L/2-84.7,  vitH:H=>H-162.3, vitQ:2, rails:2 },
  "3VT/2R": { vantaux:3, dormant:"6071BIS", railQ:2, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-49,    travQ:6,  vitL:L=>L/3-61.5,  vitH:H=>H-162.3, vitQ:3, rails:2 },
  "3VT/3R": { vantaux:3, dormant:"6073BIS", railQ:3, latQ:2, centrQ:4,  jonction:null,
              trav:L=>L/3-49,    travQ:6,  vitL:L=>L/3-61,    vitH:H=>H-162.3, vitQ:3, rails:3 },
  "4VT/2R": { vantaux:4, dormant:"6071BIS", railQ:2, latQ:4, centrQ:4,  jonction:H=>H-125, jonctionQ:1,
              trav:L=>L/4-56,    travQ:8,  vitL:L=>L/4-68.4,  vitH:H=>H-162.3, vitQ:4, rails:2 },
  "6VT/3R": { vantaux:6, dormant:"6073BIS", railQ:3, latQ:4, centrQ:8,  jonction:H=>H-125, jonctionQ:1,
              trav:L=>L/6-38,    travQ:12, vitL:L=>L/6-50.5,  vitH:H=>H-162.3, vitQ:6, rails:3 },
};

const TRAV_LABEL = {
  "2VT/2R":"(L/2) − 72,3", "3VT/2R":"(L/3) − 49",   "4VT/2R":"(L/4) − 56",
  "3VT/3R":"(L/3) − 49",   "6VT/3R":"(L/6) − 38",
};

const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
const MONT_REFS = ["6040-6057-6026-6027", "6042-6049-6028-6029V1"];
const REF_ORDER = ["6099BIS","6071BIS","6073BIS","6040-6057-6026-6027",
                   "6042-6049-6028-6029V1","6032","6044V1-6030BIS"];

function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c;
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  add("6099BIS",               "Rail",             "Droite",    "L − 86",              L-86,        a.railQ);
  add(a.dormant,               "Dormant — trav. haute", "Onglet 45°", "L",             L,           1);
  add(a.dormant,               "Dormant — trav. basse", "Onglet 45°", "L",             L,           1);
  add(a.dormant,               "Dormant — montant G",   "Onglet 45°", "H",             H,           1);
  add(a.dormant,               "Dormant — montant D",   "Onglet 45°", "H",             H,           1);
  add("6040-6057-6026-6027",   "Montant latéral",  "Droite",    "H − 69",              H-69,        a.latQ);
  add("6042-6049-6028-6029V1", "Montant central",  "Droite",    "H − 69",              H-69,        a.centrQ);
  if (a.jonction) add("6032", "Profil de jonction", "Droite", "H − 125", a.jonction(H), a.jonctionQ||1);
  add("6044V1-6030BIS",        "Traverse vantail", "Droite",    TRAV_LABEL[c.config],  a.trav(L),   a.travQ);

  return { chassis: c, lignes };
}

function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

function accessoiresChassis(c) {
  const a = CONFIGS[c.config], v = a.vantaux, Q = c.Q, acc = [];
  const add = (ref, des, qte, unite) => { if (qte > 0) acc.push({ ref, des, qte: qte * Q, unite }); };

  add("SOT_6302",    "Galet double 150 kg",                       v,         "unité");
  add("1303",        "Équerre dormant à pion 36×10",               8,         "unité");
  if (a.rails === 2) {
    add("BU_6051",   "Bouchon dormant 6071BIS/6072BIS (2R)",       2,         "unité");
    add("6310",      "Kit d'étanchéité 2 rails",                   1,         "kit");
    add("6310BIS",   "Complément étanchéité 2 rails",              1,         "kit");
  } else {
    add("BU-6053",   "Bouchon dormant 3 rails",                    2,         "unité");
    add("6311",      "Kit d'étanchéité 3 rails",                   1,         "kit");
  }
  if (a.jonction) add("PP_CB4V/PRD", "Bouchon profil jonction 4 vantaux",   1, "unité");
  add("6319",        "Bouchon montant latéral",                    a.latQ,    "lot");
  add("6315",        "Bouchon montant central",                    a.centrQ,  "lot");
  add("6312",        "Busette de drainage",                        2,         "unité");
  add("6318",        "Clapet anti-retour à bille",                 2,         "unité");
  add("BUT0195",     "Butée coulissant",                           2,         "unité");
  add("S076471P",    "Serrure VERSUS cache",                       1,         "unité");
  add("FPM6307",     "Fermeture ALPHA manuelle + gâche",           1,         "unité");
  add("33.705",      "Joint brosse 7×5 mm",
                     Math.ceil(c.H / 1000 * 1.1 * v),             "ml");
  return acc;
}

module.exports = {
  id: "prodige_semibombe",
  marque: "Rock Systems",
  gamme: "PRODIGE SEMI-BOMBE",
  label: "PRODIGE SEMI-BOMBE",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
