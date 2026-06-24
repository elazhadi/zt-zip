const express = require("express");

// Backoffice super_admin : gestion des sociétés clientes et leurs abonnements.
module.exports = function tenantsRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();
  router.use(authenticate);
  router.use(requireRole("super_admin"));

  // GET /api/tenants — liste toutes les sociétés
  router.get("/", async (req, res) => {
    const r = await pool.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.actif = TRUE) AS nb_users,
              (SELECT COUNT(*) FROM sites s WHERE s.tenant_id = t.id) AS nb_sites
         FROM tenants t
         ORDER BY t.nom`
    );
    res.json({ tenants: r.rows });
  });

  // GET /api/tenants/:id — détail d'une société
  router.get("/:id", async (req, res) => {
    const t = await pool.query("SELECT * FROM tenants WHERE id = $1", [req.params.id]);
    if (!t.rows.length) return res.status(404).json({ error: "Société introuvable" });

    const users = await pool.query(
      `SELECT u.id, u.nom, u.email, u.role, u.actif, u.site_id, u.cree_le, s.nom AS site_nom
         FROM users u LEFT JOIN sites s ON s.id = u.site_id
         WHERE u.tenant_id = $1 ORDER BY u.nom`,
      [req.params.id]
    );
    const sites = await pool.query(
      "SELECT * FROM sites WHERE tenant_id = $1 ORDER BY nom",
      [req.params.id]
    );
    const gammes = await pool.query(
      "SELECT gamme_id FROM tenant_gammes WHERE tenant_id = $1",
      [req.params.id]
    );
    res.json({
      tenant: t.rows[0],
      users:  users.rows,
      sites:  sites.rows,
      gammes: gammes.rows.map((r) => r.gamme_id),
    });
  });

  // POST /api/tenants — créer une nouvelle société
  router.post("/", async (req, res) => {
    const { nom, slug, plan = "trial", vision_enabled = false, max_users = 5, gammes = [] } = req.body || {};
    if (!nom || !slug) return res.status(400).json({ error: "nom et slug requis" });
    try {
      const r = await pool.query(
        "INSERT INTO tenants (nom, slug, plan, vision_enabled, max_users) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [nom, slug, plan, vision_enabled, max_users]
      );
      const tenant = r.rows[0];
      for (const gid of gammes) {
        await pool.query(
          "INSERT INTO tenant_gammes (tenant_id, gamme_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [tenant.id, gid]
        );
      }
      res.status(201).json({ tenant });
    } catch (e) {
      if (String(e.message).match(/unique/i)) {
        return res.status(409).json({ error: "Ce slug est déjà utilisé" });
      }
      throw e;
    }
  });

  // PATCH /api/tenants/:id — modifier plan, vision, max_users, actif, gammes
  router.patch("/:id", async (req, res) => {
    const { nom, plan, vision_enabled, max_users, actif, gammes } = req.body || {};
    const r = await pool.query(
      `UPDATE tenants SET
         nom            = COALESCE($2, nom),
         plan           = COALESCE($3, plan),
         vision_enabled = COALESCE($4, vision_enabled),
         max_users      = COALESCE($5, max_users),
         actif          = COALESCE($6, actif)
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        nom          ?? null,
        plan         ?? null,
        typeof vision_enabled === "boolean" ? vision_enabled : null,
        max_users    ?? null,
        typeof actif === "boolean" ? actif : null,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Société introuvable" });

    if (Array.isArray(gammes)) {
      await pool.query("DELETE FROM tenant_gammes WHERE tenant_id = $1", [req.params.id]);
      for (const gid of gammes) {
        await pool.query(
          "INSERT INTO tenant_gammes (tenant_id, gamme_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [req.params.id, gid]
        );
      }
    }
    res.json({ tenant: r.rows[0] });
  });

  return router;
};
