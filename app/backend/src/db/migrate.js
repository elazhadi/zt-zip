const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "schema.sql");

// Applique le schéma. Idempotent (CREATE TABLE IF NOT EXISTS).
// Les statements sont exécutés un par un pour rester compatible pg-mem (tests).
async function migrate(pool) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const cleaned = sql
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (e) {
      // ALTER TABLE ADD COLUMN IF NOT EXISTS peut échouer sur pg-mem quand la
      // colonne existe déjà dans le CREATE TABLE (installations fraîches en test).
      // La colonne est déjà là — on ignore.
      if (/^ALTER TABLE/i.test(stmt) && /already exists/i.test(e.message)) continue;
      throw e;
    }
  }
  return statements.length;
}

module.exports = { migrate };
