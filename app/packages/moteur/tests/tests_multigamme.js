/**
 * TESTS — Architecture multi-gammes / multi-marques
 * =================================================
 * Vérifie le registre, les garde-fous, et que « ajouter une gamme = ajouter une
 * définition » fonctionne de bout en bout. N'invente AUCUNE formule réelle :
 * la gamme de test ci-dessous est une FIXTURE (valeurs factices), pas un produit.
 * Lancer : node tests/tests_multigamme.js
 */

const M = require("../src/index.js");

let pass = 0, fail = 0;
function check(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log((ok ? "✅" : "❌") + " " + label +
              (ok ? "" : `  attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(got)}`));
  ok ? pass++ : fail++;
}
function throws(label, fn) {
  let threw = false;
  try { fn(); } catch (_) { threw = true; }
  check(label, threw, true);
}

// --- Registre : ULYSSE 70 présente par défaut ---
const gammes = M.listeGammes();
check("ULYSSE 70 enregistrée", gammes.some((g) => g.id === "ulysse70"), true);
check("ULYSSE 70 expose ses 7 configs", M.getGamme("ulysse70").configIds.length, 7);

// --- Compat : un châssis sans champ `gamme` reste ULYSSE 70 ---
const r0 = M.debiterChantier([{ config: "3VT/3R", type: "porte", L: 2895, H: 2500, Q: 1 }]);
check("Défaut ULYSSE 70 (rail = 2809)", r0.debits[0].lignes.find((l) => l.ref === "6099BIS").long, 2809);
check("Vitrage marqué gamme=ulysse70", r0.vitrage[0].gamme, "ulysse70");

// --- Garde-fous d'enregistrement ---
throws("Refuse une gamme sans id", () => M.registerGamme({ configs: { x: {} }, debiterChassis() {}, barre: { standard: 1 } }));
throws("Refuse une gamme sans abaque (configs)", () => M.registerGamme({ id: "vide", configs: {}, debiterChassis() {}, barre: { standard: 1 } }));
throws("debiterChantier refuse une gamme inconnue", () =>
  M.debiterChantier([{ gamme: "inexistante", config: "X", type: "porte", L: 2000, H: 2000, Q: 1 }]));

// --- Extensibilité : enregistrer une FIXTURE et calculer ---
const FIXTURE = {
  id: "demo-fixture",
  marque: "FIXTURE",
  gamme: "DEMO",
  label: "DEMO (fixture de test — valeurs factices)",
  barre: { standard: 6000, montants: 6000, kerf: 5 },
  montRefs: [],
  refOrder: ["DEMO.RAIL", "DEMO.MONT"],
  configs: { "1VT/1R": { vantaux: 1 } },
  configIds: ["1VT/1R"],
  debiterChassis: (c) => ({
    chassis: c,
    lignes: [
      { ref: "DEMO.RAIL", des: "Rail", coupe: "Droite", formule: "L", long: c.L, qte: 1 * c.Q },
      { ref: "DEMO.MONT", des: "Montant", coupe: "Droite", formule: "H", long: c.H, qte: 2 * c.Q },
    ],
  }),
  vitrageChassis: (c) => ({ larg: c.L - 100, haut: c.H - 100, qte: 1 * c.Q }),
  accessoiresChassis: () => [],
};
M.registerGamme(FIXTURE);
check("Fixture enregistrée", M.listeGammes().some((g) => g.id === "demo-fixture"), true);

const rf = M.debiterChantier([{ gamme: "demo-fixture", config: "1VT/1R", type: "porte", L: 2000, H: 2000, Q: 1 }]);
check("Fixture : rail débité", rf.debits[0].lignes.find((l) => l.ref === "DEMO.RAIL").long, 2000);
check("Fixture : barre = 6000mm", rf.optim["DEMO.RAIL"].bars[0].barre, 6000);
check("Fixture : vitrage 1900×1900", [rf.vitrage[0].larg, rf.vitrage[0].haut], [1900, 1900]);

// --- Un chantier peut mélanger les gammes ---
const rmix = M.debiterChantier([
  { config: "3VT/3R", type: "porte", L: 2895, H: 2500, Q: 1 },          // ULYSSE 70
  { gamme: "demo-fixture", config: "1VT/1R", type: "porte", L: 2000, H: 2000, Q: 1 },
]);
check("Mix : profilés ULYSSE + DEMO présents",
  rmix.optim["6099BIS"] !== undefined && rmix.optim["DEMO.RAIL"] !== undefined, true);

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
