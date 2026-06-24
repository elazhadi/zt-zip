/**
 * MOTEUR DE DÉBITAGE — point d'entrée (CommonJS, source de vérité)
 * ===============================================================
 * Multi-gammes : le calcul est piloté par des définitions de gamme (src/gammes/)
 * via un registre (src/registry.js). ULYSSE 70 est la gamme livrée par défaut.
 *
 * Un châssis = { config, type, L, H, Q, color, gamme? }
 *   gamme : identifiant de gamme (défaut "ulysse70").
 *
 * Pour ajouter une gamme : voir AJOUTER_UNE_GAMME.md. Ne jamais inventer de formule.
 */

const registry = require("./registry");
const { optimiser, buildRefSort } = require("./engine/coulissant");
const ulysse70 = require("./gammes/ulysse70");

// refSort global (compat) — ordre ULYSSE 70 par défaut. Pour un chantier donné,
// utiliser le refSort renvoyé par debiterChantier (couvre les gammes présentes).
const refSort = buildRefSort([ulysse70.refOrder]);

const API = {
  // ---- API multi-gammes ----
  debiterChantier: registry.debiterChantier,
  debiterChassis: registry.debiterChassis,
  vitrageChassis: registry.vitrageChassis,
  accessoiresChassis: registry.accessoiresChassis,
  aggregateAccessoires: registry.aggregateAccessoires,
  optimiser,
  listeGammes:     registry.listeGammes,
  catalogueGammes: registry.catalogueGammes,
  getGamme:        registry.getGamme,
  registerGamme:   registry.registerGamme,

  // ---- Surface de compatibilité ULYSSE 70 (anciens consommateurs) ----
  ABAQUE: ulysse70.configs,
  BARRE_LEN: ulysse70.barre.standard,
  BARRE_LEN_MONT: ulysse70.barre.montants,
  KERF: ulysse70.barre.kerf,
  refSort,
};

// Export universel (CommonJS + navigateur). Les consommateurs ESM passent par
// index.mjs (qui ré-exporte cet objet).
if (typeof module !== "undefined" && module.exports) module.exports = API;
if (typeof window !== "undefined") window.MoteurDebitage = API;
