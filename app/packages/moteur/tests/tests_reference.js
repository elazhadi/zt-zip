/**
 * TESTS DE NON-RÉGRESSION — Moteur de débitage ULYSSE 70
 * =======================================================
 * Valeurs de référence validées contre ProGES (chantier réel DVYP26176).
 * Lancer : node tests/tests_reference.js (depuis le dossier packages/moteur)
 * Le moteur DOIT passer tous ces tests. À conserver et étendre quand on
 * ajoute des gammes ou des configs.
 */

const M = require("../src/index.js");

let pass = 0, fail = 0;
function check(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log((ok ? "✅" : "❌") + " " + label +
              (ok ? "" : `  attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(got)}`));
  ok ? pass++ : fail++;
}

// --- CAS 1 : châssis 3VT/3R porte-fenêtre 2895×2500 (repère 0001) ---
const r1 = M.debiterChantier([{ config:"3VT/3R", type:"porte", L:2895, H:2500, Q:1, color:"Blanc" }]);
const L1 = r1.debits[0].lignes;
const find = (lignes, ref, long) => lignes.find(l => l.ref===ref && l.long===long);

check("Rail 6099BIS = 2809mm",        find(L1,"6099BIS",2809)?.long, 2809);
check("Rail quantité = 3",            find(L1,"6099BIS",2809)?.qte, 3);
check("Dormant horizontal = 2895",    find(L1,"PL600.03",2895)?.long, 2895);
check("Dormant montant = 2500",       find(L1,"PL600.03",2500)?.long, 2500);
check("Montant latéral = 2430mm",     find(L1,"PL600.10-11",2430)?.long, 2430);
check("Montant latéral quantité = 2", find(L1,"PL600.10-11",2430)?.qte, 2);
check("Montant central = 2430mm",     find(L1,"PL600.20-21-22",2430)?.long, 2430);
check("Montant central quantité = 4", find(L1,"PL600.20-21-22",2430)?.qte, 4);
check("Traverse = 953mm",             find(L1,"PL600.30",953)?.long, 953);
check("Traverse quantité = 6",        find(L1,"PL600.30",953)?.qte, 6);

// couvre-joint porte-fenêtre = 3 côtés : pas de "bas"
const cjBas = L1.filter(l => l.ref==="PL600.60" && l.des.includes("bas"));
check("Couvre-joint bas absent (porte-fenêtre)", cjBas.length, 0);

// vitrage
check("Vitrage largeur = 897",  r1.vitrage[0].larg, 897);
check("Vitrage hauteur = 2336", r1.vitrage[0].haut, 2336);
check("Vitrage quantité = 3",   r1.vitrage[0].qte, 3);

// accessoires (validés sur 3VT/3R)
const acc1 = r1.accessoires;
const accQ = ref => acc1.find(a => a.ref===ref)?.qte;
check("Galets RS_0603 = 6",   accQ("RS_0603"), 6);
check("Équerres 1303 = 8",    accQ("1303"), 8);
check("Kit étanchéité KE_0621 (3 rails)", acc1.some(a=>a.ref==="KE_0621"), true);
check("Bouchon latéral BR0630 = 2",  accQ("BR0630"), 2);
check("Bouchon central BR0634 = 4",  accQ("BR0634"), 4);

// --- CAS 2 : type fenêtre ajoute le couvre-joint bas ---
const r2 = M.debiterChantier([{ config:"3VT/3R", type:"fenetre", L:2895, H:2500, Q:1, color:"Blanc" }]);
const cjBas2 = r2.debits[0].lignes.filter(l => l.ref==="PL600.60" && l.des.includes("bas"));
check("Couvre-joint bas présent (fenêtre)", cjBas2.length, 1);

// --- CAS 3 : mise en barre du chantier DVYP26176 (2 châssis) = 18 barres ---
const r3 = M.debiterChantier([
  { config:"3VT/3R", type:"porte", L:2895, H:2500, Q:1, color:"Blanc" },
  { config:"3VT/3R", type:"porte", L:2870, H:2480, Q:1, color:"Blanc" },
]);
check("Total barres = 18", r3.stats.barres, 18);
check("6099BIS = 3 barres",        r3.optim["6099BIS"].bars.length, 3);
check("PL600.03 = 4 barres",       r3.optim["PL600.03"].bars.length, 4);
check("PL600.10-11 = 2 barres",    r3.optim["PL600.10-11"].bars.length, 2);
check("PL600.20-21-22 = 4 barres", r3.optim["PL600.20-21-22"].bars.length, 4);
check("PL600.30 = 2 barres",       r3.optim["PL600.30"].bars.length, 2);
check("PL600.60 = 3 barres",       r3.optim["PL600.60"].bars.length, 3);

// --- CAS 4 : config avec jonction (8VT/4R) ---
const r4 = M.debiterChantier([{ config:"8VT/4R", type:"porte", L:6000, H:2400, Q:1, color:"Gris" }]);
check("8VT/4R rail = 5914",     r4.debits[0].lignes.find(l=>l.ref==="6099BIS")?.long, 5914);
check("8VT/4R jonction présente", r4.debits[0].lignes.some(l=>l.ref==="PL600.32"), true);
check("8VT/4R traverse = 758",  r4.debits[0].lignes.find(l=>l.ref==="PL600.30")?.long, 758);

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
