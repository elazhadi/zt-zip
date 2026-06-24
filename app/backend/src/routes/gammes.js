const express = require("express");
const M = require("@ulysse70/moteur");
const { authenticate } = require("../middleware/auth");

// Liste des gammes/marques disponibles (registre du moteur). Sert le sélecteur
// marque → gamme → config côté frontend.
module.exports = function gammesRoutes() {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/gammes
  router.get("/", (req, res) => {
    res.json({ gammes: M.listeGammes() });
  });

  return router;
};
