const { Pool } = require("pg");

// Pool PostgreSQL de production, construit depuis l'environnement.
// Les tests injectent leur propre pool (pg-mem) — ce module n'est pas importé là.
//
// SSL : la plupart des bases managées (Render externe, Neon, Supabase, Railway)
// exigent SSL. On l'active si l'URL le demande (sslmode=require) ou via PGSSL=true.
const url = process.env.DATABASE_URL || "";
const needSsl = /sslmode=require/i.test(url) || process.env.PGSSL === "true";

const pool = new Pool({
  connectionString: url,
  ssl: needSsl ? { rejectUnauthorized: false } : undefined,
});

module.exports = { pool };
