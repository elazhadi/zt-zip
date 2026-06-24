const express = require("express");

module.exports = function sitesRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/sites
  router.get("/", async (req, res) => {
    if (req.user.role === "super_admin") {
      const r = await pool.query("SELECT * FROM sites ORDER BY nom");
      return res.json({ sites: r.rows });
    }
    if (req.user.role === "admin") {
      const r = await pool.query(
        "SELECT * FROM sites WHERE tenant_id = $1 ORDER BY nom",
        [req.user.tenant_id]
      );
      return res.json({ sites: r.rows });
    }
    const r = await pool.query("SELECT * FROM sites WHERE id = $1", [req.user.site_id]);
    res.json({ sites: r.rows });
  });

  // POST /api/sites — admin
  router.post("/", requireRole("admin", "super_admin"), async (req, res) => {
    const { nom, adresse } = req.body || {};
    if (!nom) return res.status(400).json({ error: "nom requis" });
    const r = await pool.query(
      "INSERT INTO sites (tenant_id, nom, adresse, actif) VALUES ($1,$2,$3,TRUE) RETURNING *",
      [req.user.tenant_id, nom, adresse || null]
    );
    res.status(201).json({ site: r.rows[0] });
  });

  // PATCH /api/sites/:id — admin
  router.patch("/:id", requireRole("admin", "super_admin"), async (req, res) => {
    const { nom, adresse, actif } = req.body || {};
    // Vérifie que le site appartient au tenant.
    const check = await pool.query("SELECT tenant_id FROM sites WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Site introuvable" });
    if (req.user.role !== "super_admin" && check.rows[0].tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    const r = await pool.query(
      `UPDATE sites SET
         nom     = COALESCE($2, nom),
         adresse = COALESCE($3, adresse),
         actif   = COALESCE($4, actif)
       WHERE id = $1 RETURNING *`,
      [req.params.id, nom ?? null, adresse ?? null, typeof actif === "boolean" ? actif : null]
    );
    res.json({ site: r.rows[0] });
  });

  return router;
};
