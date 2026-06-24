const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const sitesRoutes = require("./routes/sites");
const chantiersRoutes = require("./routes/chantiers");
const debitageRoutes = require("./routes/debitage");
const visionRoutes = require("./routes/vision");

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
  app.use("/api/chantiers", chantiersRoutes(pool));
  app.use("/api/debitage", debitageRoutes());
  app.use("/api/vision", visionRoutes(visionClient));

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
