const { Pool } = require("pg");

// Pool PostgreSQL de production, construit depuis l'environnement.
// Les tests injectent leur propre pool (pg-mem) — ce module n'est pas importé là.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
