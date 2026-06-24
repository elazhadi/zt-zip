const express = require("express");
const M = require("@ulysse70/moteur");

const { debiterChantier } = M;

module.exports = function debitageRoutes(_pool, { authenticate }) {
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
        type:   c.type,
        L:      Number(c.L),
        H:      Number(c.H),
        Q:      Number(c.Q) || 1,
        color:  c.color || "",
      }));
      const { debits, optim, vitrage, accessoires, stats } = debiterChantier(lot);
      res.json({ debits, optim, vitrage, accessoires, stats });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
