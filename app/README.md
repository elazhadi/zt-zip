# Application de débitage ULYSSE 70 — full stack

Application web de débitage de menuiserie aluminium **ULYSSE 70 / PL600** (Rock
Systems / Strugal). Saisie ou lecture photo d'un croquis → débitage profilés,
optimisation de mise en barre (FFD), vitrage, accessoires → exports PDF/Excel,
historique multi-sites.

> Le cœur métier (`@ulysse70/moteur`) est validé contre ProGES (chantier
> DVYP26176) : **30 tests de référence**. Ne jamais inventer de formule —
> voir `ABAQUE_ULYSSE70.md` dans le dossier de spécification.

## Architecture (monorepo npm workspaces)

```
app/
├── packages/moteur/   @ulysse70/moteur — moteur de calcul isomorphe, MULTI-GAMMES
│   ├── engine/coulissant.js   moteur générique (FFD, tri) — aucune formule de gamme
│   ├── gammes/ulysse70.js     gamme livrée (abaque ULYSSE 70)
│   ├── gammes/_TEMPLATE.js    squelette pour ajouter une gamme
│   ├── registry.js            registre + garde-fous
│   └── tests/                 30 cas ProGES + 12 tests multi-gammes
├── frontend/          React + Vite — calculateur, historique, lecture photo
│                      sélecteur marque/gamme · exports PDF (jsPDF) + Excel (SheetJS)
├── backend/           Node + Express 5 + PostgreSQL
│                      auth JWT + rôles · sites · gammes · chantiers · débitage · vision
│                      tests/api.test.js  → 11 tests d'intégration (pg-mem)
└── docker-compose.yml db + backend + frontend (nginx)
```

Le moteur est la **source de vérité** : il tourne côté frontend (calcul instantané)
et côté backend (recalcul fiable pour les exports).

### Multi-gammes / multi-marques

Le moteur gère plusieurs gammes (ULYSSE 70 livrée par défaut). **Ajouter une
gamme = ajouter une définition** (un fichier `gammes/<id>.js`), sans modifier le
moteur — voir **`packages/moteur/AJOUTER_UNE_GAMME.md`**. Chaque châssis porte un
champ `gamme` (défaut `ulysse70`) ; un chantier peut mélanger les gammes.

> ⚠️ **Règle absolue :** les formules viennent de l'**abaque atelier** de chaque
> gamme — jamais extrapolées. Le registre refuse une gamme sans abaque.

## Lots livrés

| Lot | Contenu | État |
|-----|---------|------|
| L0 | Package moteur partagé + tests | ✅ 30/30 |
| L1 | Frontend calculateur (saisie, résultats, exports PDF/Excel) | ✅ |
| L2 | Backend + PostgreSQL + auth JWT + rôles + sites | ✅ |
| L3 | Historique chantiers (CRUD + recherche, scoping par rôle) | ✅ |
| L4 | Lecture croquis (upload → vision Anthropic → pré-remplissage) | ✅ |
| L5 | Durcissement : validation, Docker, docker-compose | ✅ |

## Démarrage rapide — Docker (tout la stack)

```bash
cd app
# (optionnel) export ANTHROPIC_API_KEY=sk-ant-...   # active la lecture photo
docker compose up --build
```

- Frontend : http://localhost:8080
- API : http://localhost:8080/api (proxifiée par nginx vers le backend)
- Admin par défaut : `admin@ulysse70.local` / `admin1234` (à changer en prod via
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Démarrage en développement (sans Docker)

Prérequis : Node 22+. PostgreSQL requis uniquement pour le backend.

```bash
cd app
npm install

# 1) Moteur — vérifier les 30 tests de référence
npm run test:moteur          # → 30 réussis, 0 échoués

# 2) Backend (nécessite un PostgreSQL accessible)
cp backend/.env.example backend/.env   # renseigner DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run migrate                        # crée le schéma
npm run seed                           # crée l'admin + l'abaque
npm run dev:backend                    # API sur http://localhost:4000

# 3) Frontend (proxy /api → http://localhost:4000)
npm run dev:frontend                   # Vite sur http://localhost:5173 (accessible LAN/tablette)
```

Le **calculateur fonctionne sans backend** (moteur en local). La connexion
débloque l'enregistrement des chantiers, l'historique et la lecture photo.

## Tests

```bash
npm test                # moteur (30) + backend (9)
npm run test:moteur     # moteur seul
npm run test:backend    # backend seul (pg-mem en mémoire, aucun Docker requis)
```

## API (résumé)

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/login` | — | Connexion → `{ token, user }` |
| GET | `/api/auth/me` | connecté | Profil courant |
| POST | `/api/auth/register` | admin / responsable | Créer un compte |
| GET/POST/PATCH | `/api/sites` | lecture: connecté / écriture: admin | Sites |
| GET | `/api/chantiers` | scoping par rôle | Historique + recherche (`q`, `from`, `to`) |
| GET/POST/PATCH/DELETE | `/api/chantiers/:id` | scoping par rôle | CRUD chantier (+ recalcul moteur) |
| POST | `/api/debitage` | connecté | Débitage à la volée (source de vérité) |
| POST | `/api/vision/lire` | connecté | Photo → JSON pré-rempli (multipart `image`) |

**Visibilité par rôle :** vendeur → ses chantiers · responsable → son site ·
admin → tout.

## Points d'attention métier (non négociables)

- **Clé API vision côté backend uniquement.** Jamais exposée au frontend
  (`/api/vision/lire` fait l'appel ; sans clé → 503, saisie manuelle).
- **Photo = pré-remplissage, l'humain valide.** Aucun calcul automatique sur
  cotes lues ; les champs issus de la photo sont surlignés.
- **Pas de tarification** dans l'application (décision métier).
- **Formules issues de l'abaque atelier**, jamais extrapolées.
