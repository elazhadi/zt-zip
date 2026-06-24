require("dotenv").config();

const { createApp } = require("./app");
const { pool } = require("./db/pool");
const { migrate } = require("./db/migrate");
const { seed, seedColoris } = require("./db/seed");
const { createVisionClient } = require("./vision/client");

const PORT = process.env.PORT || 4000;

async function main() {
  // Applique le schéma et les données de base au démarrage.
  await migrate(pool);
  const seedResult = await seed(pool);

  // Répare les utilisateurs sans tenant_id (installations pré-multi-tenant).
  const repaired = await pool.query(`
    UPDATE users u
    SET tenant_id = (SELECT id FROM tenants ORDER BY id LIMIT 1)
    WHERE u.tenant_id IS NULL
    RETURNING id, email
  `);
  if (repaired.rows.length) {
    console.log(`[repair] tenant_id réparé pour : ${repaired.rows.map(r => r.email).join(", ")}`);
  }

  await seedColoris(pool); // coloris par défaut pour les tenants existants
  if (seedResult.created) {
    console.log(`[seed] Admin créé : ${seedResult.adminEmail} / ${seedResult.adminPass}`);
    console.log("[seed] ⚠️  Changez ce mot de passe en production.");
  }

  const visionClient = createVisionClient();
  if (!visionClient) {
    console.log("[vision] ANTHROPIC_API_KEY absente — lecture photo désactivée (saisie manuelle).");
  }

  const app = createApp({ pool, visionClient });
  app.listen(PORT, () => {
    console.log(`API ULYSSE 70 en écoute sur http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Échec du démarrage :", e);
  process.exit(1);
});
