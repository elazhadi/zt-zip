/**
 * GAMME ULYSSE 70 / PL600 (Rock Systems / Strugal)
 * ================================================
 * Définition de gamme : abaque (formules de coupe par config) + paramètres de
 * mise en barre + règles d'accessoires. Formules validées contre ProGES
 * (chantier DVYP26176) — voir ABAQUE_ULYSSE70.md.
 *
 * C'est le MODÈLE à dupliquer pour ajouter une gamme (voir gammes/_TEMPLATE.js
 * et AJOUTER_UNE_GAMME.md). Ne jamais inventer de formule : chaque gamme a son abaque.
 */

const { round1 } = require("../engine/coulissant");

// ---------------------------------------------------------------------------
// ABAQUE — formules de coupe par configuration.
// Communes : Rail = L - 86 ; Montants latéraux & centraux = H - 70.
// Dormant = cadre périmétrique (2 horizontaux = L, 2 montants = H), onglet 45°.
// ---------------------------------------------------------------------------
const CONFIGS = {
  "2VT/2R": { vantaux:2, dormant:"PL600.01", railQ:2, latQ:2, centrQ:2, jonction:null,
              trav:L=>L/2-36,  travQ:4,  vitL:L=>L/2-95,   vitH:H=>H-164, vitQ:2, rails:2 },
  "3VT/2R": { vantaux:3, dormant:"PL600.01", railQ:2, latQ:2, centrQ:4, jonction:null,
              trav:L=>L/3-12,  travQ:6,  vitL:L=>L/3-68,   vitH:H=>H-164, vitQ:3, rails:2 },
  "4VT/2R": { vantaux:4, dormant:"PL600.01", railQ:2, latQ:4, centrQ:4, jonction:H=>H-126, jonctionQ:1,
              trav:L=>L/4-21,  travQ:8,  vitL:L=>L/4-79,   vitH:H=>H-164, vitQ:4, rails:2 },
  "3VT/3R": { vantaux:3, dormant:"PL600.03", railQ:3, latQ:2, centrQ:4, jonction:null,
              trav:L=>L/3-12,  travQ:6,  vitL:L=>L/3-68,   vitH:H=>H-164, vitQ:3, rails:3 },
  "6VT/3R": { vantaux:6, dormant:"PL600.03", railQ:3, latQ:4, centrQ:8, jonction:H=>H-126, jonctionQ:1,
              trav:L=>L/6-1.5, travQ:8,  vitL:L=>L/6-58,   vitH:H=>H-164, vitQ:6, rails:3 },
  "4VT/4R": { vantaux:4, dormant:"PL600.04", railQ:4, latQ:4, centrQ:6, jonction:null,
              trav:L=>L/4+0.7, travQ:4,  vitL:L=>L/4-55.5, vitH:H=>H-164, vitQ:4, rails:4 },
  "8VT/4R": { vantaux:8, dormant:"PL600.04", railQ:4, latQ:4, centrQ:12, jonction:H=>H-70, jonctionQ:1,
              trav:L=>L/8+8,   travQ:16, vitL:L=>L/8-48,   vitH:H=>H-164, vitQ:4, rails:4 },
};

const TRAV_LABEL = {
  "2VT/2R":"(L/2) − 36", "3VT/2R":"(L/3) − 12", "4VT/2R":"(L/4) − 21",
  "3VT/3R":"(L/3) − 12", "6VT/3R":"(L/6) − 1,5", "4VT/4R":"(L/4) + 0,7", "8VT/4R":"(L/8) + 8",
};

// Paramètres de mise en barre.
const BARRE = { standard: 6030, montants: 6600, kerf: 5 };
// Profilés débités sur barres de 6,60 m.
const MONT_REFS = ["PL600.10-11", "PL600.20-21-22"];
// Ordre d'affichage des profilés.
const REF_ORDER = ["6099BIS","PL600.01","PL600.03","PL600.04","PL600.10-11",
                   "PL600.20-21-22","PL600.32","PL600.30","PL600.60"];

// ---------------------------------------------------------------------------
// DÉBITAGE d'un châssis
// ---------------------------------------------------------------------------
function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const { L, H } = c;
  const lignes = [];
  const add = (ref, des, coupe, formule, long, qte) =>
    lignes.push({ ref, des, coupe, formule, long: round1(long), qte: qte * c.Q });

  add("6099BIS", "Rail bombé", "Droite", "L − 86", L-86, a.railQ);
  add(a.dormant, "Dormant — traverse haute", "Onglet 45°", "L", L, 1);
  add(a.dormant, "Dormant — traverse basse", "Onglet 45°", "L", L, 1);
  add(a.dormant, "Dormant — montant G", "Onglet 45°", "H", H, 1);
  add(a.dormant, "Dormant — montant D", "Onglet 45°", "H", H, 1);
  add("PL600.10-11", "Montant latéral", "Droite", "H − 70", H-70, a.latQ);
  add("PL600.20-21-22", "Montant central", "Droite", "H − 70", H-70, a.centrQ);
  if (a.jonction) add("PL600.32", "Profil de jonction", "Droite", "selon config", a.jonction(H), a.jonctionQ||1);
  add("PL600.30", "Traverse vantail", "Droite", TRAV_LABEL[c.config], a.trav(L), a.travQ);

  // Couvre-joint PL600.60 — piloté par le type d'ouvrage.
  add("PL600.60", "Couvre-joint — haut", "Droite", "L", L, 1);
  add("PL600.60", "Couvre-joint — montant G/D", "Droite", "H", H, 2);
  if (c.type === "fenetre") add("PL600.60", "Couvre-joint — bas", "Droite", "L", L, 1);

  return { chassis: c, lignes };
}

// ---------------------------------------------------------------------------
// VITRAGE d'un châssis
// ---------------------------------------------------------------------------
function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

// ---------------------------------------------------------------------------
// ACCESSOIRES d'un châssis
// Règles déduites de la commande ProGES DVYP26176 (validées sur 3VT/3R).
// Les autres configs sont des extrapolations — à faire valider par l'atelier.
// ---------------------------------------------------------------------------
function accessoiresChassis(c) {
  const a = CONFIGS[c.config], v = a.vantaux, Q = c.Q, acc = [];
  const add = (ref, des, qte, unite) => { if (qte > 0) acc.push({ ref, des, qte: qte*Q, unite }); };

  add("RS_0603", "Galet réglable simple 80 kg", 2*v, "unité");          // 2 par vantail
  add("1303", "Équerre à pion 36 x 10", 8, "unité");                    // cadre dormant
  add("6312", "Busette d'évacuation", 2, "unité");
  add("6318", "Clapet anti-retour à bille", 2, "unité");
  add("BUT0195", "Butée pour coulissant", 2, "unité");

  const kit = { 2:["KE_0620","Kit étanchéité 2 rails dormant"],
                3:["KE_0621","Kit étanchéité 3 rails dormant"],
                4:["KE_0622","Kit étanchéité 4 rails"] }[a.rails];
  add(kit[0], kit[1], 1, "unité");

  add("BR0630", "Couple bouchon montant latéral", a.latQ, "lot");
  add("BR0634", "Couple bouchon montant central", a.centrQ, "lot");
  add("ST6193PD", "Poignée coudée 3 pts + mécanisme — D", 1, "unité");
  add("ST6193PG", "Poignée coudée 3 pts + mécanisme — G", 1, "unité");

  const perim = 2*(c.L + c.H)/1000; // ml
  add("6104", "Joint de vitrage 12 mm", Math.ceil(perim * a.vitQ), "ml");
  add("FN69*550", "Joint brosse périphérique 7x6.5", Math.ceil(perim * v * 1.3), "ml");

  return acc;
}

module.exports = {
  id: "ulysse70",
  marque: "Strugal / Rock Systems",
  gamme: "ULYSSE 70 / PL600",
  label: "ULYSSE 70 / PL600",
  barre: BARRE,
  montRefs: MONT_REFS,
  refOrder: REF_ORDER,
  configs: CONFIGS,
  configIds: Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
