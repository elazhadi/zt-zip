const express = require("express");
const M = require("@ulysse70/moteur");

// Résout la liste de gammes accessibles pour un utilisateur.
// Priorité : user_gammes → tenant_gammes → toutes.
async function resolveGammes(pool, user, allGammes) {
  if (!pool || !user.tenant_id) return allGammes;

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  if (!isAdmin) {
    const uR = await pool.query(
      "SELECT gamme_id FROM user_gammes WHERE user_id = $1",
      [user.id]
    );
    if (uR.rows.length > 0) {
      const userAllowed = new Set(uR.rows.map((r) => r.gamme_id));
      return allGammes.filter((g) => userAllowed.has(g.id));
    }
  }

  const tR = await pool.query(
    "SELECT gamme_id FROM tenant_gammes WHERE tenant_id = $1",
    [user.tenant_id]
  );
  if (!tR.rows.length) return allGammes;
  const tenantAllowed = new Set(tR.rows.map((r) => r.gamme_id));
  return allGammes.filter((g) => tenantAllowed.has(g.id));
}

module.exports = function gammesRoutes(pool, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/gammes — liste filtrée par user puis tenant.
  router.get("/", async (req, res) => {
    const gammes = await resolveGammes(pool, req.user, M.listeGammes());
    res.json({ gammes });
  });

  // GET /api/gammes/catalogue — données techniques complètes (idem filtrage).
  router.get("/catalogue", async (req, res) => {
    const gammes = await resolveGammes(pool, req.user, M.catalogueGammes());
    res.json({ gammes });
  });

  return router;
};
