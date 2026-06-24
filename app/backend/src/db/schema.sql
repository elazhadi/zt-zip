-- Schéma ULYSSE 70 — voir cahier des charges §3.1
-- Le débitage/optim/accessoires sont CALCULÉS à la volée par le moteur, pas stockés.

CREATE TABLE IF NOT EXISTS sites (
  id        SERIAL PRIMARY KEY,
  nom       TEXT NOT NULL,
  adresse   TEXT,
  actif     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  site_id   INTEGER REFERENCES sites(id),
  nom       TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  hash_mdp  TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'vendeur',  -- vendeur | responsable | admin
  cree_le   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chantiers (
  id               SERIAL PRIMARY KEY,
  site_id          INTEGER NOT NULL REFERENCES sites(id),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  reference_client TEXT,
  statut           TEXT NOT NULL DEFAULT 'brouillon',  -- brouillon | valide | archive
  date_creation    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chassis (
  id           SERIAL PRIMARY KEY,
  chantier_id  INTEGER NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  repere       INTEGER NOT NULL,
  gamme        TEXT NOT NULL DEFAULT 'ulysse70',
  config       TEXT NOT NULL,
  type_ouvrage TEXT NOT NULL,   -- porte | fenetre
  largeur      INTEGER NOT NULL,
  hauteur      INTEGER NOT NULL,
  quantite     INTEGER NOT NULL DEFAULT 1,
  coloris      TEXT
);

-- Permet d'ajouter des gammes sans redéploiement (cf. §9 extensibilité).
CREATE TABLE IF NOT EXISTS abaques (
  id        SERIAL PRIMARY KEY,
  gamme     TEXT NOT NULL,
  version   TEXT NOT NULL,
  data_json TEXT NOT NULL,
  actif     BOOLEAN NOT NULL DEFAULT TRUE
);
