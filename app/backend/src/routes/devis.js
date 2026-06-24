const express = require("express");

module.exports = function devisRoutes(pool, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /devis
  router.get("/", async (req, res) => {
    const r = await pool.query(
      `SELECT d.id, d.numero, d.reference_client, d.client_nom, d.statut,
              d.montant_ht, d.date_creation, d.tarif_id,
              u.nom AS user_nom, t.nom AS tarif_nom
         FROM devis d
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN tarifs t ON t.id = d.tarif_id
        WHERE d.tenant_id = $1
        ORDER BY d.date_creation DESC`,
      [req.user.tenant_id]
    );
    res.json({ devis: r.rows });
  });

  // POST /devis
  router.post("/", async (req, res) => {
    const {
      tarif_id, reference_client, client_nom, client_ville, client_contact,
      client_tel, client_adresse, intermediaire, chassis_json, results_json, montant_ht,
    } = req.body || {};
    if (!chassis_json || !results_json) {
      return res.status(400).json({ error: "chassis_json et results_json requis" });
    }
    const r = await pool.query(
      `INSERT INTO devis
         (tenant_id, site_id, user_id, tarif_id, reference_client,
          client_nom, client_ville, client_contact, client_tel, client_adresse,
          intermediaire, chassis_json, results_json, montant_ht)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        req.user.tenant_id, req.user.site_id || null, req.user.id, tarif_id || null,
        reference_client || null, client_nom || null, client_ville || null,
        client_contact || null, client_tel || null, client_adresse || null,
        intermediaire || null, chassis_json, results_json,
        montant_ht != null ? montant_ht : null,
      ]
    );
    const id = r.rows[0].id;
    const numero = `DEV-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;
    await pool.query("UPDATE devis SET numero = $1 WHERE id = $2", [numero, id]);
    res.status(201).json({ id, numero });
  });

  // GET /devis/:id
  router.get("/:id", async (req, res) => {
    const r = await pool.query(
      `SELECT d.*, u.nom AS user_nom, t.nom AS tarif_nom
         FROM devis d
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN tarifs t ON t.id = d.tarif_id
        WHERE d.id = $1 AND d.tenant_id = $2`,
      [req.params.id, req.user.tenant_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Devis introuvable" });
    const d = r.rows[0];
    res.json({
      devis: {
        ...d,
        chassis: JSON.parse(d.chassis_json),
        results: JSON.parse(d.results_json),
      },
    });
  });

  // PATCH /devis/:id — statut uniquement
  router.patch("/:id", async (req, res) => {
    const { statut } = req.body || {};
    const VALID = ["nouveau", "envoyé", "confirmé", "annulé"];
    if (statut && !VALID.includes(statut)) return res.status(400).json({ error: "Statut invalide" });
    const r = await pool.query(
      "UPDATE devis SET statut = COALESCE($1, statut) WHERE id = $2 AND tenant_id = $3 RETURNING id, statut",
      [statut || null, req.params.id, req.user.tenant_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Devis introuvable" });
    res.json({ devis: r.rows[0] });
  });

  // DELETE /devis/:id
  router.delete("/:id", async (req, res) => {
    await pool.query(
      "DELETE FROM devis WHERE id = $1 AND tenant_id = $2",
      [req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  });

  return router;
};
