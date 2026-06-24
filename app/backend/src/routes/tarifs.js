const express = require("express");

module.exports = function tarifsRoutes(pool, { authenticate, requireRole }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /tarifs
  router.get("/", async (req, res) => {
    const r = await pool.query(
      "SELECT id, nom, actif, cree_le FROM tarifs WHERE tenant_id = $1 ORDER BY cree_le",
      [req.user.tenant_id]
    );
    res.json({ tarifs: r.rows });
  });

  // POST /tarifs
  router.post("/", requireRole("admin", "super_admin"), async (req, res) => {
    const nom = (req.body?.nom || "").trim();
    if (!nom) return res.status(400).json({ error: "Nom requis" });
    const r = await pool.query(
      "INSERT INTO tarifs (tenant_id, nom) VALUES ($1, $2) RETURNING id, nom, actif",
      [req.user.tenant_id, nom]
    );
    res.status(201).json({ tarif: r.rows[0] });
  });

  // PATCH /tarifs/:id
  router.patch("/:id", requireRole("admin", "super_admin"), async (req, res) => {
    const { nom, actif } = req.body || {};
    const r = await pool.query(
      `UPDATE tarifs
         SET nom   = COALESCE($1, nom),
             actif = COALESCE($2, actif)
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, nom, actif`,
      [nom?.trim() || null, actif ?? null, req.params.id, req.user.tenant_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Tarif introuvable" });
    res.json({ tarif: r.rows[0] });
  });

  // DELETE /tarifs/:id
  router.delete("/:id", requireRole("admin", "super_admin"), async (req, res) => {
    await pool.query(
      "DELETE FROM tarifs WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  });

  // GET /tarifs/:id/lignes
  router.get("/:id/lignes", async (req, res) => {
    const check = await pool.query(
      "SELECT id FROM tarifs WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.user.tenant_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: "Tarif introuvable" });
    const r = await pool.query(
      "SELECT id, ref, designation, prix_unitaire, unite_prix FROM tarif_lignes WHERE tarif_id = $1 ORDER BY ref",
      [req.params.id]
    );
    res.json({ lignes: r.rows });
  });

  // PUT /tarifs/:id/lignes — remplacement complet
  router.put("/:id/lignes", requireRole("admin", "super_admin"), async (req, res) => {
    const check = await pool.query(
      "SELECT id FROM tarifs WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.user.tenant_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: "Tarif introuvable" });
    const { lignes = [] } = req.body || {};
    await pool.query("DELETE FROM tarif_lignes WHERE tarif_id = $1", [req.params.id]);
    for (const l of lignes) {
      const ref = (l.ref || "").trim().toUpperCase();
      if (!ref) continue;
      const unite = ["barre", "ml", "unité"].includes(l.unite_prix) ? l.unite_prix : "barre";
      await pool.query(
        `INSERT INTO tarif_lignes (tarif_id, ref, designation, prix_unitaire, unite_prix)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tarif_id, ref) DO UPDATE
           SET designation = EXCLUDED.designation,
               prix_unitaire = EXCLUDED.prix_unitaire,
               unite_prix = EXCLUDED.unite_prix`,
        [req.params.id, ref, l.designation || "", Number(l.prix_unitaire) || 0, unite]
      );
    }
    const r = await pool.query(
      "SELECT id, ref, designation, prix_unitaire, unite_prix FROM tarif_lignes WHERE tarif_id = $1 ORDER BY ref",
      [req.params.id]
    );
    res.json({ lignes: r.rows });
  });

  return router;
};
