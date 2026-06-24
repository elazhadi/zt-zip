const { verifyToken } = require("../auth/jwt");

// Fabrique les middlewares auth liés à un pool donné (nécessaire pour la
// vérification de session en base — une session par utilisateur à la fois).
function createAuth(pool) {
  // Vérifie le Bearer token, valide la session en base et attache req.user.
  async function authenticate(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Token manquant" });
    }
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: "Token invalide ou expiré" });
    }
    // Vérification session unique : le session_key du JWT doit correspondre à celui
    // en base ; si l'utilisateur s'est reconnecté ailleurs, l'ancien JWT est rejeté.
    const r = await pool.query(
      "SELECT session_key, actif FROM users WHERE id = $1",
      [payload.sub]
    );
    const dbUser = r.rows[0];
    if (!dbUser || !dbUser.actif) {
      return res.status(401).json({ error: "Compte inactif ou introuvable" });
    }
    if (dbUser.session_key && dbUser.session_key !== payload.session_key) {
      return res.status(401).json({ error: "Session expirée — veuillez vous reconnecter" });
    }
    req.user = {
      id:        payload.sub,
      role:      payload.role,
      site_id:   payload.site_id,
      tenant_id: payload.tenant_id,
      nom:       payload.nom,
      email:     payload.email,
    };
    next();
  }

  // Restreint l'accès à certains rôles. Ex : requireRole("admin", "responsable").
  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Accès refusé pour ce rôle" });
      }
      next();
    };
  }

  return { authenticate, requireRole };
}

module.exports = { createAuth };
