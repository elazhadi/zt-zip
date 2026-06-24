const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { createAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const sitesRoutes = require("./routes/sites");
const chantiersRoutes = require("./routes/chantiers");
const debitageRoutes = require("./routes/debitage");
const visionRoutes = require("./routes/vision");
const gammesRoutes = require("./routes/gammes");
const usersRoutes = require("./routes/users");
const tenantsRoutes = require("./routes/tenants");
const colorisRoutes = require("./routes/coloris");
const tarifsRoutes  = require("./routes/tarifs");
const devisRoutes   = require("./routes/devis");

// Fabrique l'application Express. Pool et visionClient injectés
// (production : pg + Anthropic ; tests : pg-mem + client mocké).
function createApp({ pool, visionClient = null, corsOrigin } = {}) {
  const app = express();
  const auth = createAuth(pool);

  app.use(
    cors({
      origin: corsOrigin || process.env.CORS_ORIGIN?.split(",") || "*",
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, vision: Boolean(visionClient && visionClient.available) });
  });

  app.use("/api/auth",      authRoutes(pool, auth));
  app.use("/api/sites",     sitesRoutes(pool, auth));
  app.use("/api/gammes",    gammesRoutes(pool, auth));
  app.use("/api/chantiers", chantiersRoutes(pool, auth));
  app.use("/api/debitage",  debitageRoutes(pool, auth));
  app.use("/api/vision",    visionRoutes(visionClient, auth));
  app.use("/api/users",     usersRoutes(pool, auth));
  app.use("/api/tenants",   tenantsRoutes(pool, auth));
  app.use("/api/coloris",   colorisRoutes(pool, auth));
  app.use("/api/tarifs",    tarifsRoutes(pool, auth));
  app.use("/api/devis",     devisRoutes(pool, auth));

  // Déploiement tout-en-un : le backend sert aussi le frontend buildé.
  const staticDir = process.env.STATIC_DIR;
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  });

  return app;
}

module.exports = { createApp };
