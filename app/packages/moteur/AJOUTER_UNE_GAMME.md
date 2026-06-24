# Ajouter une gamme / une marque

Le moteur est **multi-gammes**. ULYSSE 70 / PL600 est la première gamme livrée ;
d'autres gammes (autres profilés, autres marques) s'ajoutent **sans modifier le
moteur** : on enregistre une *définition de gamme*.

## ⚠️ Règle absolue (non négociable)

> **Ne jamais inventer ni extrapoler une formule de débitage.** Les formules
> viennent de l'**abaque atelier** de la gamme (manuel de fabrication ou exports
> ProGES). Une cote mal calculée = une barre gâchée. Pas d'abaque ⇒ pas de gamme.

Le registre **refuse** une gamme sans abaque (`configs` vides) — c'est volontaire.

## Architecture

```
src/
├── engine/coulissant.js   Moteur générique (FFD, tri) — AUCUNE formule de gamme
├── gammes/
│   ├── ulysse70.js        Gamme livrée (modèle de référence)
│   └── _TEMPLATE.js       Squelette commenté à copier
├── registry.js            Registre + garde-fous + debiterChantier()
└── index.js / index.mjs   API publique (CJS source + ré-export ESM)
```

Un **châssis** porte un champ `gamme` (défaut `"ulysse70"`) :
`{ gamme, config, type, L, H, Q, color }`. Un même chantier peut mélanger les gammes.

## Procédure

1. **Obtenir l'abaque atelier** de la gamme : pour chaque configuration, les
   formules de coupe (rail, dormant, montants, traverse, jonction…), les
   dimensions de vitrage, les longueurs de barre, le trait de scie, et les
   règles d'accessoires. Recouper contre des sorties ProGES réelles.

2. **Copier le template** :
   ```bash
   cp src/gammes/_TEMPLATE.js src/gammes/<id>.js   # ex. s70p.js
   ```
   Remplir `CONFIGS` (l'abaque), `BARRE`, `MONT_REFS`, `REF_ORDER`, et la recette
   `debiterChassis` / `vitrageChassis` / `accessoiresChassis` avec les valeurs réelles.

3. **Enregistrer la gamme** dans `src/registry.js` :
   ```js
   const s70p = require("./gammes/s70p");
   registerGamme(s70p);
   ```
   *(Ou, pour éviter un redéploiement, charger la définition depuis la table
   `abaques` en base — voir « Charger depuis la base » ci-dessous.)*

4. **Ajouter une suite de tests de référence** validée contre ProGES, sur le
   modèle de `tests/tests_reference.js` : quelques châssis réels dont on connaît
   le débitage exact. Le moteur DOIT les reproduire.

5. La gamme apparaît automatiquement dans `listeGammes()` → sélecteur
   marque/gamme côté frontend, et `gamme` est persisté avec chaque châssis.

## API utile

```js
const M = require("@ulysse70/moteur");

M.listeGammes();            // [{ id, marque, gamme, label, configs }]
M.getGamme("ulysse70");     // définition complète d'une gamme
M.registerGamme(def);       // enregistre une gamme (lève si abaque absente)
M.debiterChantier(lot);     // lot = châssis (chacun avec son `gamme`)
```

## Charger depuis la base (sans redéploiement)

La table `abaques (gamme, version, data_json)` permet de stocker des définitions
de gamme et de les enregistrer au démarrage du backend via `registerGamme`. Les
formules « fonction » (qui ne se sérialisent pas en JSON) peuvent être exprimées
sous forme de coefficients dans `data_json` puis recomposées par une recette
générique — à concevoir au moment d'intégrer la 2ᵉ gamme réelle, selon la forme
de son abaque.

## Ce que le moteur garantit déjà

- ULYSSE 70 inchangée : **30 tests de référence** + **12 tests multi-gammes** verts.
- Mélange de gammes dans un même chantier (longueurs de barre résolues par gamme).
- Garde-fou : impossible d'enregistrer une gamme sans formules.
