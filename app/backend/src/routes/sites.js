const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");

// CRUD sites. Lecture pour tous les connectés ; écriture réservée à l'admin.
module.exports = function sitesRoutes(pool) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/sites
  router.get("/", async (req, res) => {
    // Un vendeur/responsable ne voit que son site ; l'admin voit tout.
    if (req.user.role === "admin") {
      const r = await pool.query("SELECT * FROM sites ORDER BY nom");
      return res.json({ sites: r.rows });
    }
    const r = await pool.query("SELECT * FROM sites WHERE id = $1", [req.user.site_id]);
    res.json({ sites: r.rows });
  });

  // POST /api/sites — admin
  router.post("/", requireRole("admin"), async (req, res) => {
    const { nom, adresse } = req.body || {};
    if (!nom) return res.status(400).json({ error: "nom requis" });
    const r = await pool.query(
      "INSERT INTO sites (nom, adresse, actif) VALUES ($1, $2, TRUE) RETURNING *",
      [nom, adresse || null]
    );
    res.status(201).json({ site: r.rows[0] });
  });

  // PATCH /api/sites/:id — admin
  router.patch("/:id", requireRole("admin"), async (req, res) => {
    const { nom, adresse, actif } = req.body || {};
    const r = await pool.query(
      `UPDATE sites SET
         nom     = COALESCE($2, nom),
         adresse = COALESCE($3, adresse),
         actif   = COALESCE($4, actif)
       WHERE id = $1 RETURNING *`,
      [req.params.id, nom ?? null, adresse ?? null, typeof actif === "boolean" ? actif : null]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Site introuvable" });
    res.json({ site: r.rows[0] });
  });

  return router;
};
