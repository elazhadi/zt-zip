-- Schéma Gabarys — gestionnaire multi-gammes aluminium (mode SaaS multi-tenant)
-- Le débitage/optim/accessoires sont CALCULÉS à la volée par le moteur, pas stockés.

-- Chaque société cliente est un tenant isolé.
CREATE TABLE IF NOT EXISTS tenants (
  id             SERIAL PRIMARY KEY,
  nom            TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  plan           TEXT NOT NULL DEFAULT 'trial',
  actif          BOOLEAN NOT NULL DEFAULT TRUE,
  vision_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_users      INTEGER NOT NULL DEFAULT 5,
  cree_le        TIMESTAMP NOT NULL DEFAULT now()
);

-- Gammes auxquelles chaque tenant a accès (vide = toutes par défaut).
CREATE TABLE IF NOT EXISTS tenant_gammes (
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gamme_id  TEXT NOT NULL,
  PRIMARY KEY (tenant_id, gamme_id)
);

CREATE TABLE IF NOT EXISTS sites (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER REFERENCES tenants(id),
  nom        TEXT NOT NULL,
  adresse    TEXT,
  actif      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER REFERENCES tenants(id),
  site_id     INTEGER REFERENCES sites(id),
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  hash_mdp    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'vendeur',
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  session_key TEXT,
  cree_le     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chantiers (
  id               SERIAL PRIMARY KEY,
  site_id          INTEGER NOT NULL REFERENCES sites(id),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  reference_client TEXT,
  statut           TEXT NOT NULL DEFAULT 'brouillon',
  date_creation    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chassis (
  id           SERIAL PRIMARY KEY,
  chantier_id  INTEGER NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  repere       INTEGER NOT NULL,
  gamme        TEXT NOT NULL DEFAULT 'ulysse70',
  config       TEXT NOT NULL,
  type_ouvrage TEXT NOT NULL,
  largeur      INTEGER NOT NULL,
  hauteur      INTEGER NOT NULL,
  quantite     INTEGER NOT NULL DEFAULT 1,
  coloris      TEXT
);

-- Registre descriptif des gammes par tenant.
CREATE TABLE IF NOT EXISTS abaques (
  id        SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  gamme     TEXT NOT NULL,
  version   TEXT NOT NULL,
  data_json TEXT NOT NULL,
  actif     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Référentiel de coloris par tenant (éditable par l'admin).
CREATE TABLE IF NOT EXISTS coloris (
  id        SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,
  ordre     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, code)
);

-- Gammes accessibles par utilisateur (vide = hérite des restrictions du tenant).
CREATE TABLE IF NOT EXISTS user_gammes (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gamme_id TEXT NOT NULL,
  PRIMARY KEY (user_id, gamme_id)
);

-- Upgrade d'installations existantes (idempotent sur PostgreSQL 9.6+).
-- Sur pg-mem (tests), ignorés si la colonne existe déjà (cf. migrate.js).
ALTER TABLE sites ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_key TEXT;
ALTER TABLE abaques ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vision_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 5;
ALTER TABLE coloris ADD COLUMN IF NOT EXISTS nom TEXT NOT NULL DEFAULT '';
-- Note : tenant_gammes vide = toutes les gammes accessibles (comportement par défaut).
-- La restriction initiale ulysse70 du seed a été supprimée (commit après multi-gammes).
-- Pour les tenants existants avec ulysse70 seul : Backoffice → société → Modifier → sauver sans gamme.
