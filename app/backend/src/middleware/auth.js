const { verifyToken } = require("../auth/jwt");

// Vérifie le Bearer token et attache req.user = { id, role, site_id, nom, email }.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token manquant" });
  }
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      site_id: payload.site_id,
      nom: payload.nom,
      email: payload.email,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
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

module.exports = { authenticate, requireRole };
