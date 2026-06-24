/**
 * REGISTRE DES GAMMES
 * ===================
 * Tient l'ensemble des gammes disponibles (par marque) et oriente le calcul
 * vers la bonne définition. Ajouter une gamme = enregistrer une définition
 * (idéalement chargée depuis la table `abaques` ou un fichier gammes/<id>.js),
 * sans modifier le moteur.
 *
 * Garde-fou : une gamme sans abaque (formules) est REFUSÉE. On n'extrapole jamais.
 */

const ulysse70           = require("./gammes/ulysse70");
const pl690              = require("./gammes/pl690");
const prodige_purligne   = require("./gammes/prodige_purligne");
const prodige_semibombe  = require("./gammes/prodige_semibombe");
const prodige_bombe      = require("./gammes/prodige_bombe");
const emeraude_coulissant = require("./gammes/emeraude_coulissant");
const { optimiser, round1, buildRefSort } = require("./engine/coulissant");

const GAMMES = new Map();
const DEFAULT_GAMME = "ulysse70";

// Enregistre une définition de gamme. Valide la présence de l'abaque.
function registerGamme(def) {
  if (!def || !def.id) {
    throw new Error("Définition de gamme invalide : champ 'id' manquant.");
  }
  if (!def.configs || Object.keys(def.configs).length === 0) {
    throw new Error(
      `Gamme "${def.id}" sans abaque : fournir les formules de coupe (configs) ` +
        "issues de l'abaque atelier. Ne jamais extrapoler."
    );
  }
  if (typeof def.debiterChassis !== "function") {
    throw new Error(`Gamme "${def.id}" : fonction 'debiterChassis' manquante.`);
  }
  if (!def.barre || !def.barre.standard) {
    throw new Error(`Gamme "${def.id}" : paramètres de barre ('barre.standard') manquants.`);
  }
  GAMMES.set(def.id, def);
  return def;
}

// Gammes livrées (abaques issus de D_bitage.pptx — Rock Systems).
registerGamme(ulysse70);
registerGamme(pl690);
registerGamme(prodige_purligne);
registerGamme(prodige_semibombe);
registerGamme(prodige_bombe);
registerGamme(emeraude_coulissant);

function getGamme(id) {
  const g = GAMMES.get(id || DEFAULT_GAMME);
  if (!g) throw new Error(`Gamme inconnue : ${id}`);
  return g;
}

function gammeOf(c) {
  return getGamme(c.gamme);
}

// Liste légère pour les sélecteurs (frontend / backend).
function listeGammes() {
  return [...GAMMES.values()].map((g) => ({
    id: g.id,
    marque: g.marque,
    gamme: g.gamme,
    label: g.label,
    configs: g.configIds,
  }));
}

function debiterChassis(c) {
  return gammeOf(c).debiterChassis(c);
}
function vitrageChassis(c) {
  return gammeOf(c).vitrageChassis(c);
}
function accessoiresChassis(c) {
  return gammeOf(c).accessoiresChassis(c);
}

function aggregateAccessoires(lot) {
  const map = {};
  lot.forEach((c) =>
    accessoiresChassis(c).forEach((a) => {
      const k = a.ref + "|" + a.des + "|" + a.unite;
      if (!map[k]) map[k] = { ...a };
      else map[k].qte += a.qte;
    })
  );
  return Object.values(map);
}

// ---------------------------------------------------------------------------
// API PRINCIPALE — un chantier peut mélanger les gammes (chaque châssis porte
// son champ `gamme`, défaut "ulysse70").
// ---------------------------------------------------------------------------
function debiterChantier(lot) {
  if (!Array.isArray(lot) || lot.length === 0) throw new Error("Chantier vide");
  const debits = lot.map(debiterChassis);
  const allLignes = debits.flatMap((d) => d.lignes);

  // Longueur de barre par profilé : chaque ref appartient à la gamme qui l'a produite.
  const refOwner = {};
  debits.forEach((d, i) => {
    const g = gammeOf(lot[i]);
    d.lignes.forEach((l) => { if (!refOwner[l.ref]) refOwner[l.ref] = g.id; });
  });
  const resolveBarre = (ref) => {
    const g = GAMMES.get(refOwner[ref]) || getGamme();
    return g.montRefs && g.montRefs.includes(ref) ? g.barre.montants : g.barre.standard;
  };
  const kerf = gammeOf(lot[0]).barre.kerf;
  const optim = optimiser(allLignes, resolveBarre, kerf);

  const vitrage = lot.map((c, i) => ({
    repere: i + 1,
    ...vitrageChassis(c),
    config: c.config,
    gamme: gammeOf(c).id,
  }));
  const accessoires = aggregateAccessoires(lot);

  // Stats de mise en barre.
  let totBars = 0, totLen = 0, totWaste = 0;
  Object.values(optim).forEach((o) =>
    o.bars.forEach((b) => { totBars++; totLen += o.barre; totWaste += b.rem; })
  );
  const stats = {
    barres: totBars,
    metreTotal_m: round1(totLen / 1000),
    chuteTotale_m: round1(totWaste / 1000),
    chutePct: totLen ? round1((totWaste / totLen) * 100) : 0,
  };

  // Tri d'affichage couvrant les gammes présentes.
  const presentIds = [...new Set(lot.map((c) => gammeOf(c).id))];
  const refSort = buildRefSort(presentIds.map((id) => GAMMES.get(id).refOrder));

  return { debits, optim, vitrage, accessoires, stats, refSort };
}

module.exports = {
  registerGamme,
  getGamme,
  listeGammes,
  debiterChassis,
  vitrageChassis,
  accessoiresChassis,
  aggregateAccessoires,
  debiterChantier,
  GAMMES,
  DEFAULT_GAMME,
};
