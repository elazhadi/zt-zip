/**
 * GAMME PRODIGE 5020 — Série à Frappe (Rock Systems)
 * ====================================================
 * Formules de coupe extraites de l'abaque atelier D_bitage.pptx
 * (images intégrées, slides 18-20). Validées sur catalogue Prodige_frappe.pdf.
 *
 * Configurations : FEN-OF-1VT, FEN-OF-2VT,
 *                  PORTE-INT-1VT (ouvrant à l'intérieur — profil 5033bis),
 *                  PORTE-EXT-1VT (ouvrant à l'extérieur — profil 5035),
 *                  FEN-FIXE, FEN-SOUFFLET
 *
 * Dormant 5021 assemblé à onglet 45°. Ouvrants (5031/5033bis/5035) à onglet 45°.
 * Parcloses & accessoires à coupe droite.
 * PORTE-INT-1VT : dormant 3 pièces (traverse haute + 2 montants, sans traverse basse).
 * PORTE-EXT-1VT : dormant 4 pièces (cadre complet).
 */

const { round1 } = require("../engine/coulissant");

const O  = 'Onglet 45°';
const D  = 'Droite';
const PC = '5055-5052-5051'; // parclose (choisir selon épaisseur vitrage)

const CONFIGS = {
  'FEN-OF-1VT': {
    cuts: (L, H) => [
      { ref: '5021', des: 'Dormant — traverse',  coupe: O, formule: 'L',           long: L,        qte: 2 },
      { ref: '5021', des: 'Dormant — montant',   coupe: O, formule: 'H',           long: H,        qte: 2 },
      { ref: '5031', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 30,6',   long: L-30.6,   qte: 2 },
      { ref: '5031', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 30,6',   long: H-30.6,   qte: 2 },
      { ref: PC,     des: 'Parclose — largeur',  coupe: D, formule: 'L − 116,4',  long: L-116.4,  qte: 2 },
      { ref: PC,     des: 'Parclose — hauteur',  coupe: D, formule: 'H − 160,4',  long: H-160.4,  qte: 2 },
    ],
    vitL: L => L-127.4, vitH: H => H-127.4, vitQ: 1,
  },
  'FEN-OF-2VT': {
    cuts: (L, H) => [
      { ref: '5021',    des: 'Dormant — traverse',  coupe: O, formule: 'L',            long: L,         qte: 2 },
      { ref: '5021',    des: 'Dormant — montant',   coupe: O, formule: 'H',            long: H,         qte: 2 },
      { ref: '5031',    des: 'Ouvrant — traverse',  coupe: O, formule: 'L/2 − 18,3',  long: L/2-18.3,  qte: 4 },
      { ref: '5031',    des: 'Ouvrant — montant',   coupe: O, formule: 'H − 30,6',    long: H-30.6,    qte: 4 },
      { ref: PC,        des: 'Parclose — largeur',  coupe: D, formule: 'L/2 − 104,1', long: L/2-104.1, qte: 4 },
      { ref: PC,        des: 'Parclose — hauteur',  coupe: D, formule: 'H − 160,4',   long: H-160.4,   qte: 4 },
      { ref: '5060bis', des: 'Battement',           coupe: D, formule: 'H − 53,6',    long: H-53.6,    qte: 1 },
    ],
    vitL: L => L/2-115.1, vitH: H => H-127.4, vitQ: 2,
  },
  'PORTE-INT-1VT': {
    // Porte ouvrante à l'intérieur — profil ouvrant 5033bis
    // Dormant 3 pièces : traverse haute + 2 montants (pas de traverse basse)
    cuts: (L, H) => [
      { ref: '5021',    des: 'Dormant — traverse haute', coupe: O, formule: 'L',          long: L,        qte: 1 },
      { ref: '5021',    des: 'Dormant — montant',        coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: '5033bis', des: 'Ouvrant — traverse',       coupe: O, formule: 'L − 30,6',  long: L-30.6,   qte: 2 },
      { ref: '5033bis', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 23,3',  long: H-23.3,   qte: 2 },
      { ref: PC,        des: 'Parclose — largeur',       coupe: D, formule: 'L − 177,8', long: L-177.8,  qte: 2 },
      { ref: PC,        des: 'Parclose — hauteur',       coupe: D, formule: 'H − 214,5', long: H-214.5,  qte: 2 },
      { ref: '5081',    des: 'Porte brosse',             coupe: D, formule: 'L − 65,6',  long: L-65.6,   qte: 1 },
    ],
    vitL: L => L-188.8, vitH: H => H-181.5, vitQ: 1,
  },
  'PORTE-EXT-1VT': {
    // Porte ouvrante à l'extérieur — profil ouvrant 5035
    // Dormant 4 pièces : cadre complet
    cuts: (L, H) => [
      { ref: '5021', des: 'Dormant — traverse',  coupe: O, formule: 'L',          long: L,        qte: 2 },
      { ref: '5021', des: 'Dormant — montant',   coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: '5035', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 30,6',  long: L-30.6,   qte: 2 },
      { ref: '5035', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 23,3',  long: H-23.3,   qte: 2 },
      { ref: PC,     des: 'Parclose — largeur',  coupe: D, formule: 'L − 171,2', long: L-171.2,  qte: 2 },
      { ref: PC,     des: 'Parclose — hauteur',  coupe: D, formule: 'H − 207,9', long: H-207.9,  qte: 2 },
      { ref: '5081', des: 'Porte brosse',        coupe: D, formule: 'L − 65,6',  long: L-65.6,   qte: 1 },
    ],
    vitL: L => L-182.2, vitH: H => H-174.9, vitQ: 1,
  },
  'FEN-FIXE': {
    cuts: (L, H) => [
      { ref: '5021', des: 'Dormant — traverse',  coupe: O, formule: 'L',         long: L,       qte: 2 },
      { ref: '5021', des: 'Dormant — montant',   coupe: O, formule: 'H',         long: H,       qte: 2 },
      { ref: PC,     des: 'Parclose — largeur',  coupe: D, formule: 'L − 42,6', long: L-42.6,  qte: 2 },
      { ref: PC,     des: 'Parclose — hauteur',  coupe: D, formule: 'H − 86,6', long: H-86.6,  qte: 2 },
    ],
    vitL: L => L-54, vitH: H => H-54, vitQ: 1,
  },
  'FEN-SOUFFLET': {
    // Même découpe que FEN-OF-1VT — quincaillerie soufflet différente
    cuts: (L, H) => [
      { ref: '5021', des: 'Dormant — traverse',  coupe: O, formule: 'L',          long: L,        qte: 2 },
      { ref: '5021', des: 'Dormant — montant',   coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: '5031', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 30,6',  long: L-30.6,   qte: 2 },
      { ref: '5031', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 30,6',  long: H-30.6,   qte: 2 },
      { ref: PC,     des: 'Parclose — largeur',  coupe: D, formule: 'L − 116,4', long: L-116.4,  qte: 2 },
      { ref: PC,     des: 'Parclose — hauteur',  coupe: D, formule: 'H − 160,4', long: H-160.4,  qte: 2 },
    ],
    vitL: L => L-127.4, vitH: H => H-127.4, vitQ: 1,
  },
};

const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
const MONT_REFS = [];
const REF_ORDER = [
  '5021', '5031', '5033bis', '5035',
  '5055-5052-5051', '5060bis', '5081',
];

function debiterChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  const cuts = a.cuts(c.L, c.H);
  const lignes = cuts.map(({ ref, des, coupe, formule, long, qte }) => ({
    ref, des, coupe, formule, long: round1(long), qte: qte * c.Q,
  }));
  return { chassis: c, lignes };
}

function vitrageChassis(c) {
  const a = CONFIGS[c.config];
  if (!a) throw new Error("Configuration inconnue : " + c.config);
  return { larg: round1(a.vitL(c.L)), haut: round1(a.vitH(c.H)), qte: a.vitQ * c.Q };
}

function accessoiresChassis(c) {
  const acc = [];
  const add = (ref, des, qte, unite) => { if (qte > 0) acc.push({ ref, des, qte: qte * c.Q, unite }); };
  const cfg = c.config;
  const is2vt = cfg.endsWith('2VT');
  const isPorte = cfg.startsWith('PORTE');

  // Équerres pour assemblage dormant
  add('A0501', 'Équerre à pion 36×30 dormant 5021', 4, 'unité');

  if (cfg === 'FEN-OF-1VT' || cfg === 'FEN-SOUFFLET') {
    add('1303', 'Équerre à pion 35,9×10 ouvrant 5031', 4, 'unité');
    add('5600', 'Paumelle réversible 60 Kg', 2, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', 1, 'unité');
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  } else if (cfg === 'FEN-OF-2VT') {
    add('1303', 'Équerre à pion 35,9×10 ouvrant 5031', 8, 'unité');
    add('5600', 'Paumelle réversible 60 Kg', 4, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', 2, 'unité');
    add('2V.OF/NR', 'Complément Kit OF 2 vantaux', 1, 'unité');
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  } else if (cfg === 'PORTE-INT-1VT') {
    add('4303-Bis', 'Équerre à pion 36×36 ouvrant 5033bis', 4, 'unité');
    add('5601', 'Paumelle réversible lourde 100 Kg', 2, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', 1, 'unité');
    add('B 0510', 'Béquille pure line ITALIA', 1, 'unité');
    add('SR-0506', 'Serrure 1 point Ø35 + Canon et gâche', 1, 'unité');
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  } else if (cfg === 'PORTE-EXT-1VT') {
    add('4303-Bis', 'Équerre à pion 36×36 ouvrant 5035', 4, 'unité');
    add('5601', 'Paumelle réversible lourde 100 Kg', 2, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', 1, 'unité');
    add('B 0510', 'Béquille pure line ITALIA', 1, 'unité');
    add('SR-0506', 'Serrure 1 point Ø35 + Canon et gâche', 1, 'unité');
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  }

  return acc;
}

module.exports = {
  id:          'prodige_5020',
  marque:      'Rock Systems',
  gamme:       'PRODIGE 5020',
  label:       'PRODIGE 5020 — Frappe',
  barre:       BARRE,
  montRefs:    MONT_REFS,
  refOrder:    REF_ORDER,
  configs:     CONFIGS,
  configIds:   Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
