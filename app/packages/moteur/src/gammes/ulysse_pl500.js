/**
 * GAMME ULYSSE PL500 — Portes et Fenêtres à Frappe (Rock Systems)
 * ================================================================
 * Formules de coupe extraites de l'abaque atelier D_bitage.pptx
 * (images intégrées, slides 12-16). Validées sur catalogue Ulysse_Frappe1.pdf (ED1.22).
 *
 * Configurations : FEN-OF-1VT, FEN-OF-2VT, FEN-EXT-1VT, FEN-EXT-2VT,
 *                  PORTE-OF-1VT, PORTE-OF-2VT, PORTE-EXT-1VT, PORTE-EXT-2VT,
 *                  FEN-FIXE, FEN-SOUFFLET
 *
 * Coupe dormant & ouvrant : Onglet 45°  — parcloses & accessoires : Droite.
 * Porte (1 ou 2 vantaux) : dormant 3 pièces (traverse haute + 2 montants), pas de traverse basse.
 * Fenêtre & fixe : dormant 4 pièces (2 traverses + 2 montants).
 */

const { round1 } = require("../engine/coulissant");

const O  = 'Onglet 45°';
const D  = 'Droite';
const PC = '5055-5052-5051'; // parclose (choisir selon épaisseur vitrage : 5055 6-8mm, 5051 10-16mm, 5052bis 18-24mm)

const CONFIGS = {
  'FEN-OF-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse',  coupe: O, formule: 'L',          long: L,        qte: 2 },
      { ref: 'PL500.02', des: 'Dormant — montant',   coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 39,6',  long: L-39.6,   qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6',  long: H-39.6,   qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',  coupe: D, formule: 'L − 126',   long: L-126,    qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',  coupe: D, formule: 'H − 170',   long: H-170,    qte: 2 },
    ],
    vitL: L => L-137, vitH: H => H-137, vitQ: 1,
  },
  'FEN-OF-2VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse',  coupe: O, formule: 'L',             long: L,         qte: 2 },
      { ref: 'PL500.02', des: 'Dormant — montant',   coupe: O, formule: 'H',             long: H,         qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — traverse',  coupe: O, formule: 'L/2 − 22,8',   long: L/2-22.8,  qte: 4 },
      { ref: 'PL500.06', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6',     long: H-39.6,    qte: 4 },
      { ref: PC,         des: 'Parclose — largeur',  coupe: D, formule: 'L/2 − 170,8',  long: L/2-170.8, qte: 4 },
      { ref: PC,         des: 'Parclose — hauteur',  coupe: D, formule: 'H − 170',      long: H-170,     qte: 4 },
      { ref: '5060bis',  des: 'Battement',           coupe: D, formule: 'H − 106,6',    long: H-106.6,   qte: 1 },
    ],
    vitL: L => L/2-120.2, vitH: H => H-137, vitQ: 2,
  },
  'FEN-EXT-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02',   des: 'Dormant — traverse',  coupe: O, formule: 'L',           long: L,        qte: 2 },
      { ref: 'PL500.02',   des: 'Dormant — montant',   coupe: O, formule: 'H',           long: H,        qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 39,6',   long: L-39.6,   qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6',   long: H-39.6,   qte: 2 },
      { ref: PC,           des: 'Parclose — largeur',  coupe: D, formule: 'L − 187,8',  long: L-187.8,  qte: 2 },
      { ref: PC,           des: 'Parclose — hauteur',  coupe: D, formule: 'H − 231,7',  long: H-231.7,  qte: 2 },
    ],
    vitL: L => L-198.4, vitH: H => H-198.4, vitQ: 1,
  },
  'FEN-EXT-2VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02',   des: 'Dormant — traverse',  coupe: O, formule: 'L',             long: L,         qte: 2 },
      { ref: 'PL500.02',   des: 'Dormant — montant',   coupe: O, formule: 'H',             long: H,         qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — traverse',  coupe: O, formule: 'L/2 − 22,8',   long: L/2-22.8,  qte: 4 },
      { ref: 'PL500.17/1', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6',     long: H-39.6,    qte: 4 },
      { ref: PC,           des: 'Parclose — largeur',  coupe: D, formule: 'L/2 − 170,8',  long: L/2-170.8, qte: 4 },
      { ref: PC,           des: 'Parclose — hauteur',  coupe: D, formule: 'H − 231,7',    long: H-231.7,   qte: 4 },
      { ref: '5081',       des: 'Battement',           coupe: D, formule: 'H − 106,6',    long: H-106.6,   qte: 1 },
    ],
    vitL: L => L/2-181.8, vitH: H => H-198.4, vitQ: 2,
  },
  'PORTE-OF-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse haute', coupe: O, formule: 'L',          long: L,        qte: 1 },
      { ref: 'PL500.02', des: 'Dormant — montant',        coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: 'PL500.07', des: 'Ouvrant — traverse',       coupe: O, formule: 'L − 39,6',  long: L-39.6,   qte: 2 },
      { ref: 'PL500.07', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 27,8',  long: H-27.8,   qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',       coupe: D, formule: 'L − 187,6', long: L-187.6,  qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',       coupe: D, formule: 'H − 219,8', long: H-219.8,  qte: 2 },
      { ref: '5081',     des: 'Porte brosse',             coupe: D, formule: 'L − 82,4',  long: L-82.4,   qte: 1 },
    ],
    vitL: L => L-198.6, vitH: H => H-186.8, vitQ: 1,
  },
  'PORTE-OF-2VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse haute', coupe: O, formule: 'L',            long: L,         qte: 1 },
      { ref: 'PL500.02', des: 'Dormant — montant',        coupe: O, formule: 'H',            long: H,         qte: 2 },
      { ref: 'PL500.07', des: 'Ouvrant — traverse',       coupe: O, formule: 'L/2 − 22,8',  long: L/2-22.8,  qte: 4 },
      { ref: 'PL500.07', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 27,8',    long: H-27.8,    qte: 4 },
      { ref: PC,         des: 'Parclose — largeur',       coupe: D, formule: 'L/2 − 170,8', long: L/2-170.8, qte: 4 },
      { ref: PC,         des: 'Parclose — hauteur',       coupe: D, formule: 'H − 219,8',   long: H-219.8,   qte: 4 },
      { ref: '5081',     des: 'Porte brosse',             coupe: D, formule: 'L/2 − 56,3',  long: L/2-56.3,  qte: 2 },
      { ref: '5060bis',  des: 'Battement',                coupe: D, formule: 'H − 61,3',    long: H-61.3,    qte: 1 },
    ],
    vitL: L => L/2-181.8, vitH: H => H-186.8, vitQ: 2,
  },
  'PORTE-EXT-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02',   des: 'Dormant — traverse haute', coupe: O, formule: 'L',          long: L,        qte: 1 },
      { ref: 'PL500.02',   des: 'Dormant — montant',        coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — traverse',       coupe: O, formule: 'L − 39,6',  long: L-39.6,   qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 27,8',  long: H-27.8,   qte: 2 },
      { ref: PC,           des: 'Parclose — largeur',       coupe: D, formule: 'L − 187,8', long: L-187.8,  qte: 2 },
      { ref: PC,           des: 'Parclose — hauteur',       coupe: D, formule: 'H − 219,8', long: H-219.8,  qte: 2 },
      { ref: '5081',       des: 'Porte brosse',             coupe: D, formule: 'L − 74,8',  long: L-74.8,   qte: 1 },
    ],
    vitL: L => L-198.4, vitH: H => H-186.8, vitQ: 1,
  },
  'PORTE-EXT-2VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02',   des: 'Dormant — traverse haute', coupe: O, formule: 'L',            long: L,         qte: 1 },
      { ref: 'PL500.02',   des: 'Dormant — montant',        coupe: O, formule: 'H',            long: H,         qte: 2 },
      { ref: 'PL500.17/1', des: 'Ouvrant — traverse',       coupe: O, formule: 'L/2 − 22,8',  long: L/2-22.8,  qte: 4 },
      { ref: 'PL500.17/1', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 27,8',    long: H-27.8,    qte: 4 },
      { ref: PC,           des: 'Parclose — largeur',       coupe: D, formule: 'L/2 − 170,8', long: L/2-170.8, qte: 4 },
      { ref: PC,           des: 'Parclose — hauteur',       coupe: D, formule: 'H − 219,8',   long: H-219.8,   qte: 4 },
      { ref: '5081',       des: 'Porte brosse',             coupe: D, formule: 'L/2 − 57,8',  long: L/2-57.8,  qte: 2 },
      { ref: '5060bis',    des: 'Battement',                coupe: D, formule: 'H − 45,4',    long: H-45.4,    qte: 1 },
    ],
    vitL: L => L/2-181.6, vitH: H => H-186.6, vitQ: 2,
  },
  // Oscillo-battant fenêtre 1 vantail — même profilés et même coupes que FEN-OF-1VT
  // (PL500.06 dormant + ouvrant). Seule la quincaillerie diffère (ferrage OB).
  'FEN-OB-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse',  coupe: O, formule: 'L',          long: L,        qte: 2 },
      { ref: 'PL500.02', des: 'Dormant — montant',   coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 39,6',  long: L-39.6,   qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6',  long: H-39.6,   qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',  coupe: D, formule: 'L − 126',   long: L-126,    qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',  coupe: D, formule: 'H − 170',   long: H-170,    qte: 2 },
    ],
    vitL: L => L-137, vitH: H => H-137, vitQ: 1,
  },
  // Oscillo-battant porte 1 vantail — même profilés et même coupes que PORTE-OF-1VT
  // (PL500.07 dormant + ouvrant). Seule la quincaillerie diffère (ferrage OB).
  'PORTE-OB-1VT': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse haute', coupe: O, formule: 'L',          long: L,        qte: 1 },
      { ref: 'PL500.02', des: 'Dormant — montant',        coupe: O, formule: 'H',          long: H,        qte: 2 },
      { ref: 'PL500.07', des: 'Ouvrant — traverse',       coupe: O, formule: 'L − 39,6',  long: L-39.6,   qte: 2 },
      { ref: 'PL500.07', des: 'Ouvrant — montant',        coupe: O, formule: 'H − 27,8',  long: H-27.8,   qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',       coupe: D, formule: 'L − 187,6', long: L-187.6,  qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',       coupe: D, formule: 'H − 219,8', long: H-219.8,  qte: 2 },
      { ref: '5081',     des: 'Porte brosse',             coupe: D, formule: 'L − 82,4',  long: L-82.4,   qte: 1 },
    ],
    vitL: L => L-198.6, vitH: H => H-186.8, vitQ: 1,
  },
  'FEN-FIXE': {
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse',  coupe: O, formule: 'L',         long: L,       qte: 2 },
      { ref: 'PL500.02', des: 'Dormant — montant',   coupe: O, formule: 'H',         long: H,       qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',  coupe: D, formule: 'L − 51,6', long: L-51.6,  qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',  coupe: D, formule: 'H − 95,6', long: H-95.6,  qte: 2 },
    ],
    vitL: L => L-62, vitH: H => H-62, vitQ: 1,
  },
  'FEN-SOUFFLET': {
    // Même découpe que FEN-OF-1VT — quincaillerie différente (compas soufflet)
    cuts: (L, H) => [
      { ref: 'PL500.02', des: 'Dormant — traverse',  coupe: O, formule: 'L',         long: L,       qte: 2 },
      { ref: 'PL500.02', des: 'Dormant — montant',   coupe: O, formule: 'H',         long: H,       qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — traverse',  coupe: O, formule: 'L − 39,6', long: L-39.6,  qte: 2 },
      { ref: 'PL500.06', des: 'Ouvrant — montant',   coupe: O, formule: 'H − 39,6', long: H-39.6,  qte: 2 },
      { ref: PC,         des: 'Parclose — largeur',  coupe: D, formule: 'L − 126',  long: L-126,   qte: 2 },
      { ref: PC,         des: 'Parclose — hauteur',  coupe: D, formule: 'H − 170',  long: H-170,   qte: 2 },
    ],
    vitL: L => L-137, vitH: H => H-137, vitQ: 1,
  },
};

const BARRE = { standard: 6000, montants: 6000, kerf: 5 };
const MONT_REFS = [];
const REF_ORDER = [
  'PL500.02', 'PL500.06', 'PL500.07', 'PL500.17/1',
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
  const isOB = cfg.includes('-OB-');

  // Équerres pour assemblage dormant (4 coins)
  add('1302', 'Équerre à pion 35,9×14 dormant', 4, 'unité');

  if (isOB) {
    const isPorteOB = isPorte;
    add(isPorteOB ? '5601' : '5600',
        isPorteOB ? 'Paumelle réversible lourde 100 Kg' : 'Paumelle réversible 60 Kg',
        2, 'unité');
    add('ST5711', 'Crémone + Mécanisme OB Classique', 1, 'pièce');
    add('4303BIS', 'Équerre vantail OB', 4, 'unité');                    // 4 coins par vantail
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  } else if (!isPorte && !cfg.includes('FIXE')) {
    // Ouvrant fenêtre : paumelles + crémone OF
    add('5600', 'Paumelle réversible 60 Kg', is2vt ? 4 : 2, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', is2vt ? 2 : 1, 'unité');
    if (is2vt) add('2V.OF/NR', 'Complément Kit OF 2 vantaux', 1, 'unité');
    add('4303BIS', 'Équerre vantail OF', is2vt ? 8 : 4, 'unité');        // 4 coins × vantaux
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  } else if (isPorte) {
    // Porte : paumelles lourdes + crémone + poignée
    add('5601', 'Paumelle réversible lourde 100 Kg', is2vt ? 4 : 2, 'unité');
    add('PITALIA', 'Crémone OF ITALIA + Kit', is2vt ? 2 : 1, 'unité');
    add('B 0510', 'Béquille pure line ITALIA', 1, 'unité');
    add('SR-0506', 'Serrure 1 point Ø35 + Canon et gâche', 1, 'unité');
    add('4303BIS', 'Équerre vantail porte', is2vt ? 8 : 4, 'unité');     // 4 coins × vantaux
    add('5304', 'Jeu bouchon pour battue', 1, 'unité');
  }

  return acc;
}

module.exports = {
  id:          'ulysse_pl500',
  marque:      'Rock Systems',
  gamme:       'ULYSSE PL500',
  label:       'ULYSSE PL500 — Frappe',
  barre:       BARRE,
  montRefs:    MONT_REFS,
  refOrder:    REF_ORDER,
  configs:     CONFIGS,
  configIds:   Object.keys(CONFIGS),
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
};
