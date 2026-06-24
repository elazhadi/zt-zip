const express = require("express");

const DEFAULT_COLORIS = [
  { code: '9010',  nom: 'Blanc pur' },
  { code: '9005',  nom: 'Noir profond' },
  { code: 'X7760', nom: 'Gris métal' },
  { code: 'SX3714',nom: 'Beige sable' },
  { code: 'SX3724',nom: 'Gris clair' },
];

module.exports = function colorisRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();

  // GET /api/coloris — auto-seed les défauts si le tenant n'en a aucun.
  router.get("/", authenticate, async (req, res) => {
    const tid = req.user.tenant_id;
    let r = await pool.query(
      "SELECT id, code, nom, ordre FROM coloris WHERE tenant_id = $1 ORDER BY ordre, code",
      [tid]
    );
    if (r.rows.length === 0 && tid) {
      for (let i = 0; i < DEFAULT_COLORIS.length; i++) {
        const { code, nom } = DEFAULT_COLORIS[i];
        await pool.query(
          `INSERT INTO coloris (tenant_id, code, nom, ordre) VALUES ($1, $2, $3, $4)
           ON CONFLICT (tenant_id, code) DO UPDATE SET nom = EXCLUDED.nom WHERE coloris.nom = ''`,
          [tid, code, nom, i]
        );
      }
      r = await pool.query(
        "SELECT id, code, nom, ordre FROM coloris WHERE tenant_id = $1 ORDER BY ordre, code",
        [tid]
      );
    }
    res.json({ coloris: r.rows });
  });

  // POST /api/coloris  { code, nom? }
  router.post("/", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
    const code = (req.body?.code || "").trim().toUpperCase();
    const nom  = (req.body?.nom  || "").trim();
    if (!code) return res.status(400).json({ error: "Code coloris requis" });
    try {
      const maxR = await pool.query(
        "SELECT COALESCE(MAX(ordre), -1) AS m FROM coloris WHERE tenant_id = $1",
        [req.user.tenant_id]
      );
      const ordre = maxR.rows[0].m + 1;
      const r = await pool.query(
        "INSERT INTO coloris (tenant_id, code, nom, ordre) VALUES ($1, $2, $3, $4) RETURNING id, code, nom, ordre",
        [req.user.tenant_id, code, nom, ordre]
      );
      res.status(201).json({ coloris: r.rows[0] });
    } catch (e) {
      if (/unique/i.test(e.message)) return res.status(409).json({ error: "Ce coloris existe déjà" });
      throw e;
    }
  });

  // PATCH /api/coloris/:id  { nom }
  router.patch("/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
    const nom = (req.body?.nom ?? "").trim();
    const r = await pool.query(
      "UPDATE coloris SET nom = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, code, nom, ordre",
      [nom, req.params.id, req.user.tenant_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Coloris introuvable" });
    res.json({ coloris: r.rows[0] });
  });

  // DELETE /api/coloris/:id
  router.delete("/:id", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
    await pool.query(
      "DELETE FROM coloris WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  });

  return router;
};
