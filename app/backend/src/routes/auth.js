const express = require("express");
const { signToken, generateSessionKey, hashPassword, checkPassword } = require("../auth/jwt");

module.exports = function authRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();

  // POST /api/auth/login — { email, password } → { token, user }
  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email et password requis" });
    }
    const r = await pool.query(
      "SELECT u.*, t.vision_enabled FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1",
      [email]
    );
    const user = r.rows[0];
    if (!user || !(await checkPassword(password, user.hash_mdp))) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }
    if (!user.actif) {
      return res.status(403).json({ error: "Compte désactivé — contactez votre administrateur" });
    }
    // Nouvelle session : invalide toute session précédente.
    const sessionKey = generateSessionKey();
    await pool.query("UPDATE users SET session_key = $1 WHERE id = $2", [sessionKey, user.id]);
    const token = signToken(user, sessionKey);
    res.json({
      token,
      user: {
        id:             user.id,
        nom:            user.nom,
        email:          user.email,
        role:           user.role,
        site_id:        user.site_id,
        tenant_id:      user.tenant_id,
        vision_enabled: user.vision_enabled ?? false,
      },
    });
  });

  // GET /api/auth/me — profil courant
  router.get("/me", authenticate, async (req, res) => {
    const r = await pool.query(
      "SELECT u.*, t.vision_enabled FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1",
      [req.user.id]
    );
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({
      user: {
        id:             user.id,
        nom:            user.nom,
        email:          user.email,
        role:           user.role,
        site_id:        user.site_id,
        tenant_id:      user.tenant_id,
        vision_enabled: user.vision_enabled ?? false,
      },
    });
  });

  // POST /api/auth/logout — invalide la session courante
  router.post("/logout", authenticate, async (req, res) => {
    await pool.query("UPDATE users SET session_key = NULL WHERE id = $1", [req.user.id]);
    res.json({ ok: true });
  });

  // POST /api/auth/register — création d'un compte dans le même tenant (admin/responsable)
  // { nom, email, password, role, site_id }
  router.post("/register", authenticate, requireRole("admin", "responsable", "super_admin"), async (req, res) => {
    const { nom, email, password, role = "vendeur", site_id } = req.body || {};
    if (!nom || !email || !password) {
      return res.status(400).json({ error: "nom, email, password requis" });
    }
    const validRoles = ["vendeur", "responsable", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    let targetSite = site_id;
    let targetTenant = req.user.tenant_id;
    if (req.user.role === "responsable") {
      targetSite   = req.user.site_id;
      targetTenant = req.user.tenant_id;
      if (role === "admin") return res.status(403).json({ error: "Un responsable ne peut pas créer d'admin" });
    }
    // Vérifie la limite max_users du tenant.
    const countR = await pool.query(
      "SELECT COUNT(*) AS n FROM users WHERE tenant_id = $1 AND actif = TRUE",
      [targetTenant]
    );
    const tenantR = await pool.query("SELECT max_users FROM tenants WHERE id = $1", [targetTenant]);
    const maxUsers = tenantR.rows[0]?.max_users ?? 5;
    if (Number(countR.rows[0].n) >= maxUsers) {
      return res.status(403).json({ error: `Limite de ${maxUsers} utilisateurs atteinte pour ce compte` });
    }
    try {
      const hash = await hashPassword(password);
      const r = await pool.query(
        "INSERT INTO users (tenant_id, site_id, nom, email, hash_mdp, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nom, email, role, site_id, tenant_id",
        [targetTenant, targetSite || null, nom, email, hash, role]
      );
      res.status(201).json({ user: r.rows[0] });
    } catch (e) {
      if (String(e.message).match(/unique/i)) {
        return res.status(409).json({ error: "Email déjà utilisé" });
      }
      throw e;
    }
  });

  return router;
};
