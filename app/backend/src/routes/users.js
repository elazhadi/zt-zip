const express = require("express");
const { hashPassword } = require("../auth/jwt");

module.exports = function usersRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();
  router.use(authenticate);
  router.use(requireRole("admin", "super_admin"));

  // GET /api/users — liste du tenant (super_admin voit tous)
  router.get("/", async (req, res) => {
    if (req.user.role === "super_admin") {
      const r = await pool.query(
        `SELECT u.id, u.nom, u.email, u.role, u.actif, u.site_id, u.tenant_id, u.cree_le,
                s.nom AS site_nom, t.nom AS tenant_nom
           FROM users u
           LEFT JOIN sites s ON s.id = u.site_id
           LEFT JOIN tenants t ON t.id = u.tenant_id
           ORDER BY t.nom, u.nom`
      );
      return res.json({ users: r.rows });
    }
    const r = await pool.query(
      `SELECT u.id, u.nom, u.email, u.role, u.actif, u.site_id, u.tenant_id, u.cree_le,
              s.nom AS site_nom
         FROM users u
         LEFT JOIN sites s ON s.id = u.site_id
         WHERE u.tenant_id = $1
         ORDER BY u.nom`,
      [req.user.tenant_id]
    );
    res.json({ users: r.rows });
  });

  // POST /api/users — créer un utilisateur dans le tenant
  router.post("/", async (req, res) => {
    const { nom, email, password, role = "vendeur", site_id } = req.body || {};
    if (!nom || !email || !password) {
      return res.status(400).json({ error: "nom, email, password requis" });
    }
    const validRoles = ["vendeur", "responsable", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    const tenantId = req.user.tenant_id;
    // Limite max_users du tenant.
    const countR = await pool.query(
      "SELECT COUNT(*) AS n FROM users WHERE tenant_id = $1 AND actif = TRUE",
      [tenantId]
    );
    const tenantR = await pool.query("SELECT max_users FROM tenants WHERE id = $1", [tenantId]);
    const maxUsers = tenantR.rows[0]?.max_users ?? 5;
    if (Number(countR.rows[0].n) >= maxUsers) {
      return res.status(403).json({ error: `Limite de ${maxUsers} utilisateurs atteinte` });
    }
    try {
      const hash = await hashPassword(password);
      const r = await pool.query(
        "INSERT INTO users (tenant_id, site_id, nom, email, hash_mdp, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nom, email, role, site_id, tenant_id, actif",
        [tenantId, site_id || null, nom, email, hash, role]
      );
      res.status(201).json({ user: r.rows[0] });
    } catch (e) {
      if (String(e.message).match(/unique/i)) {
        return res.status(409).json({ error: "Email déjà utilisé" });
      }
      throw e;
    }
  });

  // PATCH /api/users/:id — modifier nom, role, site_id, actif
  router.patch("/:id", async (req, res) => {
    const { nom, role, site_id, actif } = req.body || {};
    const validRoles = ["vendeur", "responsable", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    const check = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const target = check.rows[0];
    if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (req.user.role !== "super_admin" && Number(target.tenant_id) !== Number(req.user.tenant_id)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    const r = await pool.query(
      `UPDATE users SET
         nom     = COALESCE($2, nom),
         role    = COALESCE($3, role),
         site_id = COALESCE($4, site_id),
         actif   = COALESCE($5, actif)
       WHERE id = $1 RETURNING id, nom, email, role, site_id, actif, tenant_id`,
      [req.params.id, nom ?? null, role ?? null, site_id ?? null, typeof actif === "boolean" ? actif : null]
    );
    res.json({ user: r.rows[0] });
  });

  // DELETE /api/users/:id — désactivation (soft delete)
  router.delete("/:id", async (req, res) => {
    const check = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const target = check.rows[0];
    if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (req.user.role !== "super_admin" && Number(target.tenant_id) !== Number(req.user.tenant_id)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ error: "Impossible de se désactiver soi-même" });
    }
    await pool.query("UPDATE users SET actif = FALSE, session_key = NULL WHERE id = $1", [req.params.id]);
    res.status(204).end();
  });

  return router;
};
