const express = require("express");

const DEFAULT_COLORIS = ['9010', '9005', 'X7760', 'SX3714', 'SX3724'];

module.exports = function colorisRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();

  // GET /api/coloris — auto-seed les défauts si le tenant n'en a aucun.
  router.get("/", authenticate, async (req, res) => {
    const tid = req.user.tenant_id;
    let r = await pool.query(
      "SELECT id, code, ordre FROM coloris WHERE tenant_id = $1 ORDER BY ordre, code",
      [tid]
    );
    if (r.rows.length === 0 && tid) {
      for (let i = 0; i < DEFAULT_COLORIS.length; i++) {
        await pool.query(
          "INSERT INTO coloris (tenant_id, code, ordre) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [tid, DEFAULT_COLORIS[i], i]
        );
      }
      r = await pool.query(
        "SELECT id, code, ordre FROM coloris WHERE tenant_id = $1 ORDER BY ordre, code",
        [tid]
      );
    }
    res.json({ coloris: r.rows });
  });

  // POST /api/coloris  { code }
  router.post("/", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
    const code = (req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Code coloris requis" });
    try {
      const maxR = await pool.query(
        "SELECT COALESCE(MAX(ordre), -1) AS m FROM coloris WHERE tenant_id = $1",
        [req.user.tenant_id]
      );
      const ordre = maxR.rows[0].m + 1;
      const r = await pool.query(
        "INSERT INTO coloris (tenant_id, code, ordre) VALUES ($1, $2, $3) RETURNING id, code, ordre",
        [req.user.tenant_id, code, ordre]
      );
      res.status(201).json({ coloris: r.rows[0] });
    } catch (e) {
      if (/unique/i.test(e.message)) return res.status(409).json({ error: "Ce coloris existe déjà" });
      throw e;
    }
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
