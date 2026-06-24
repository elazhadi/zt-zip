const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "schema.sql");

// Applique le schéma. Idempotent (CREATE TABLE IF NOT EXISTS).
// Les statements sont exécutés un par un pour rester compatible pg-mem (tests).
async function migrate(pool) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  // Retire les lignes entièrement en commentaire (les commentaires en fin de
  // ligne sont conservés : le moteur SQL les gère), puis découpe sur ';'.
  const cleaned = sql
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  return statements.length;
}

module.exports = { migrate };
