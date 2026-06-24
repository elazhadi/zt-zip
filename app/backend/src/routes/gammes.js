const express = require("express");
const M = require("@ulysse70/moteur");

// Gammes disponibles pour le tenant courant. Si le tenant a des entrées dans
// tenant_gammes, seules celles-ci sont exposées ; sinon toutes sont renvoyées.
module.exports = function gammesRoutes(pool, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/gammes/catalogue — données techniques complètes (configs, barres, profilés).
  router.get("/catalogue", async (req, res) => {
    res.json({ gammes: M.catalogueGammes() });
  });

  router.get("/", async (req, res) => {
    const all = M.listeGammes();
    if (!pool || !req.user.tenant_id) {
      return res.json({ gammes: all });
    }
    const r = await pool.query(
      "SELECT gamme_id FROM tenant_gammes WHERE tenant_id = $1",
      [req.user.tenant_id]
    );
    if (!r.rows.length) {
      // Pas de restriction configurée : toutes les gammes sont accessibles.
      return res.json({ gammes: all });
    }
    const allowed = new Set(r.rows.map((row) => row.gamme_id));
    res.json({ gammes: all.filter((g) => allowed.has(g.id)) });
  });

  return router;
};
