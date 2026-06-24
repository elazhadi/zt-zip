const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const sitesRoutes = require("./routes/sites");
const chantiersRoutes = require("./routes/chantiers");
const debitageRoutes = require("./routes/debitage");
const visionRoutes = require("./routes/vision");
const gammesRoutes = require("./routes/gammes");

// Fabrique l'application Express. Le pool et le client vision sont injectés
// (production : pg + Anthropic ; tests : pg-mem + client mocké).
function createApp({ pool, visionClient = null, corsOrigin } = {}) {
  const app = express();

  app.use(
    cors({
      origin: corsOrigin || process.env.CORS_ORIGIN?.split(",") || "*",
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, vision: Boolean(visionClient && visionClient.available) });
  });

  app.use("/api/auth", authRoutes(pool));
  app.use("/api/sites", sitesRoutes(pool));
  app.use("/api/gammes", gammesRoutes());
  app.use("/api/chantiers", chantiersRoutes(pool));
  app.use("/api/debitage", debitageRoutes());
  app.use("/api/vision", visionRoutes(visionClient));

  // Déploiement « tout-en-un » : si STATIC_DIR est défini, le backend sert aussi
  // le frontend buildé (une seule origine → pas de CORS, pas de proxy, une seule URL).
  const staticDir = process.env.STATIC_DIR;
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // Fallback SPA : toute requête GET non-/api renvoie index.html.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // Gestionnaire d'erreurs final (les routes async throw remontent ici via Express 5,
  // ou sont catch localement en Express 4 ; ce filet attrape les erreurs synchrones).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  });

  return app;
}

module.exports = { createApp };
