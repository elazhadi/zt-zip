/**
 * GAMME ULYSSE 70 / PL600 (Rock Systems)
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
// Montants RENFORCÉS débités sur barres de 6,60 m (les simples sur 6,03 m).
const MONT_REFS = ["PL600.11", "PL600.22"];
// Ordre d'affichage des profilés.
const REF_ORDER = ["6099BIS","PL600.01","PL600.03","PL600.04",
                   "PL600.10","PL600.11","PL600.20","PL600.22",
                   "PL600.32","PL600.30","PL600.60"];

// Règle atelier : montant SIMPLE si H < 2000, RENFORCÉ si H ≥ 2000.
// La case à cocher du formulaire (champ `renforce`) prime si elle est fournie.
function estRenforce(c) {
  return typeof c.renforce === "boolean" ? c.renforce : c.H >= 2000;
}

// Joint de vitrage EPDM SÉRIE COULISSANTE PL600 (catalogue atelier).
const JOINTS_PL600 = {
  6:"6101", 8:"6102", 10:"6103", 12:"6104",
  14:"6105", 16:"6106", 18:"6107", 20:"6108",
  22:"6109", 24:"6110", 26:"6111",
};
const DEFAULT_EP_VITRAGE = 12;

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

  const renforce = estRenforce(c);
  const latRef  = renforce ? "PL600.11" : "PL600.10";
  const centRef = renforce ? "PL600.22" : "PL600.20";
  const suffixe = renforce ? " renforcé" : " simple";

  add("6099BIS", "Rail bombé", "Droite", "L − 86", L-86, a.railQ);
  add(a.dormant, "Dormant — traverse haute", "Onglet 45°", "L", L, 1);
  add(a.dormant, "Dormant — traverse basse", "Onglet 45°", "L", L, 1);
  add(a.dormant, "Dormant — montant G", "Onglet 45°", "H", H, 1);
  add(a.dormant, "Dormant — montant D", "Onglet 45°", "H", H, 1);
  add(latRef,  "Montant latéral" + suffixe, "Droite", "H − 70", H-70, a.latQ);
  add(centRef, "Montant central" + suffixe, "Droite", "H − 70", H-70, a.centrQ);
  if (a.jonction) add("PL600.32", "Profil de jonction", "Droite", "selon config", a.jonction(H), a.jonctionQ||1);
  add("PL600.30", "Traverse vantail", "Droite", TRAV_LABEL[c.config], a.trav(L), a.travQ);

  // Couvre-joint PL600.60 — périmètre complet pour tous types (ProGES).
  add("PL600.60", "Couvre-joint — haut", "Droite", "L", L, 1);
  add("PL600.60", "Couvre-joint — bas", "Droite", "L", L, 1);
  add("PL600.60", "Couvre-joint — montant G/D", "Droite", "H", H, 2);

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
  const renforce = estRenforce(c);

  add("RS_0603", "Galet réglable simple 80 kg", 2*v, "unité");          // 2 par vantail
  add("1303", "Équerre à pion 36 x 10", 4, "unité");                    // 4 coins du dormant
  add("ED0505", "Équerre d'alignement dormant", 4, "unité");             // 4 par dormant
  add("6312", "Busette d'évacuation", a.rails * 2, "unité");             // 2 par rail (1 par extrémité)
  add("6318", "Clapet anti-retour à bille", 2, "unité");
  add("BUT0195", "Butée pour coulissant", 2, "unité");

  const kit = { 2:["KE_0620","Kit étanchéité 2 rails dormant"],
                3:["KE_0621","Kit étanchéité 3 rails dormant"],
                4:["KE_0622","Kit étanchéité 4 rails"] }[a.rails];
  add(kit[0], kit[1], 1, "unité");
  add("BU0650", "Bouchon d'extrémité dormant", a.rails * 2, "unité");   // 2 par rail (gauche + droite)

  if (renforce) {
    add("BR0630", "Couple bouchon montant latéral renforcé", a.latQ, "lot");
    add("BR0634", "Couple bouchon montant central renforcé", a.centrQ, "lot");
  }
  // Poignée : 2 points si montant simple, 3 points si renforcé.
  if (renforce) {
    add("ST6193PD", "Poignée coudée 3 pts + mécanisme — D", 1, "unité");
    add("ST6193PG", "Poignée coudée 3 pts + mécanisme — G", 1, "unité");
  } else {
    add("ST6192PD", "Poignée coudée 2 pts + mécanisme — D", 1, "unité");
    add("ST6192PG", "Poignée coudée 2 pts + mécanisme — G", 1, "unité");
  }

  const perim = 2*(c.L + c.H)/1000; // ml
  const epVit    = c.epaisseurVitrage || DEFAULT_EP_VITRAGE;
  const jointRef = JOINTS_PL600[epVit] || JOINTS_PL600[DEFAULT_EP_VITRAGE];
  add(jointRef, `Joint de vitrage EPDM ${epVit} mm`, Math.ceil(perim * a.vitQ), "ml");
  add("FN69*550", "Joint brosse périphérique 7x6.5", Math.ceil(perim * v * 1.3), "ml");

  return acc;
}

module.exports = {
  id: "ulysse70",
  marque: "Rock Systems",
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
