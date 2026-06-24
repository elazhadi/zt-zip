/**
 * MOTEUR GÉNÉRIQUE — coulissants aluminium
 * ========================================
 * Logique de calcul indépendante de la gamme. Une « définition de gamme »
 * (voir src/gammes/) fournit l'abaque (formules de coupe) et les paramètres
 * propres à une gamme ; ce moteur fournit l'optimisation de mise en barre (FFD),
 * le tri d'affichage et les utilitaires communs.
 *
 * NE CONTIENT AUCUNE FORMULE DE GAMME. Les formules viennent de l'abaque atelier
 * de chaque gamme — jamais extrapolées (cf. cahier des charges §5, §9).
 */

const round1 = (x) => Math.round(x * 10) / 10;

// Résolveur de barre par défaut (compat ULYSSE 70) si aucun n'est fourni.
const DEFAULT_RESOLVE_BARRE = (ref) =>
  ref === "PL600.10-11" || ref === "PL600.20-21-22" ? 6600 : 6030;

/**
 * Optimisation de mise en barre — First-Fit Decreasing (FFD).
 * Regroupe toutes les pièces d'un même profilé puis les place.
 * @param {Array} allLignes   lignes de débitage { ref, long, qte, ... }
 * @param {Function} [resolveBarre]  ref → longueur de barre (mm). Défaut : ULYSSE 70.
 * @param {number} [kerf]      trait de scie (mm). Défaut : 5.
 */
function optimiser(allLignes, resolveBarre, kerf = 5) {
  const resolve = typeof resolveBarre === "function" ? resolveBarre : DEFAULT_RESOLVE_BARRE;
  const byRef = {};
  allLignes.forEach((l) => {
    if (!byRef[l.ref]) byRef[l.ref] = [];
    for (let i = 0; i < l.qte; i++) byRef[l.ref].push(l.long);
  });

  const result = {};
  for (const ref in byRef) {
    const barre = resolve(ref);
    const items = byRef[ref].slice().sort((a, b) => b - a); // décroissant
    const bars = [];
    items.forEach((len) => {
      let placed = false;
      for (const b of bars) {
        const need = len + (b.cuts.length ? kerf : 0);
        if (b.rem >= need) {
          b.rem -= need;
          b.cuts.push(len);
          placed = true;
          break;
        }
      }
      if (!placed) bars.push({ rem: barre - len, cuts: [len], barre });
    });
    result[ref] = { bars, barre };
  }
  return result;
}

/**
 * Construit un comparateur d'affichage à partir d'un ou plusieurs ordres de
 * profilés (un par gamme présente). Les refs inconnues passent en fin, triées
 * alphabétiquement.
 */
function buildRefSort(orders) {
  const order = [];
  orders.forEach((arr) => (arr || []).forEach((r) => { if (!order.includes(r)) order.push(r); }));
  return (a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a < b ? -1 : a > b ? 1 : 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  };
}

module.exports = { round1, optimiser, buildRefSort };
