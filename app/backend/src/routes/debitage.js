const express = require("express");
const M = require("@ulysse70/moteur");
const { authenticate } = require("../middleware/auth");

const { debiterChantier } = M;

// Calcul du débitage côté serveur — source de vérité pour les exports/recalculs.
// Sans persistance : on envoie un lot de châssis, on reçoit le résultat complet.
module.exports = function debitageRoutes() {
  const router = express.Router();
  router.use(authenticate);

  // POST /api/debitage  { chassis: [{ config, type, L, H, Q, color }] }
  router.post("/", (req, res) => {
    const { chassis } = req.body || {};
    if (!Array.isArray(chassis) || chassis.length === 0) {
      return res.status(400).json({ error: "Au moins un châssis requis" });
    }
    try {
      const lot = chassis.map((c) => ({
        config: c.config,
        type: c.type,
        L: Number(c.L),
        H: Number(c.H),
        Q: Number(c.Q) || 1,
        color: c.color || "",
      }));
      const { debits, optim, vitrage, accessoires, stats } = debiterChantier(lot);
      res.json({ debits, optim, vitrage, accessoires, stats });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
