const express = require("express");
const { signToken, hashPassword, checkPassword } = require("../auth/jwt");
const { authenticate, requireRole } = require("../middleware/auth");

// Routes d'authentification et de gestion des comptes.
module.exports = function authRoutes(pool) {
  const router = express.Router();

  // POST /api/auth/login — { email, password } → { token, user }
  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email et password requis" });
    }
    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = r.rows[0];
    if (!user || !(await checkPassword(password, user.hash_mdp))) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role, site_id: user.site_id },
    });
  });

  // GET /api/auth/me — profil courant
  router.get("/me", authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  // POST /api/auth/register — création d'un compte (admin/responsable uniquement)
  // { nom, email, password, role, site_id }
  router.post("/register", authenticate, requireRole("admin", "responsable"), async (req, res) => {
    const { nom, email, password, role = "vendeur", site_id } = req.body || {};
    if (!nom || !email || !password) {
      return res.status(400).json({ error: "nom, email, password requis" });
    }
    if (!["vendeur", "responsable", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    // Un responsable ne peut créer que dans son propre site et ne peut pas créer d'admin.
    let targetSite = site_id;
    if (req.user.role === "responsable") {
      targetSite = req.user.site_id;
      if (role === "admin") return res.status(403).json({ error: "Un responsable ne peut pas créer d'admin" });
    }
    try {
      const hash = await hashPassword(password);
      const r = await pool.query(
        "INSERT INTO users (site_id, nom, email, hash_mdp, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, email, role, site_id",
        [targetSite || null, nom, email, hash, role]
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
