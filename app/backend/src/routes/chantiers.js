const express = require("express");
const M = require("@ulysse70/moteur");
const { authenticate } = require("../middleware/auth");

const { debiterChantier } = M;

// Construit la clause de visibilité selon le rôle :
//  - vendeur     : ses propres chantiers
//  - responsable : tous les chantiers de son site
//  - admin       : tout
function scopeClause(user, params) {
  if (user.role === "admin") return { where: "", params };
  if (user.role === "responsable") {
    params.push(user.site_id);
    return { where: `c.site_id = $${params.length}`, params };
  }
  params.push(user.id);
  return { where: `c.user_id = $${params.length}`, params };
}

// Mappe une ligne chassis DB → entrée moteur { config, type, L, H, Q, color }.
function toMoteur(row) {
  return {
    gamme: row.gamme || "ulysse70",
    config: row.config,
    type: row.type_ouvrage,
    L: row.largeur,
    H: row.hauteur,
    Q: row.quantite,
    color: row.coloris || "",
  };
}

module.exports = function chantiersRoutes(pool) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/chantiers?q=ref&from=YYYY-MM-DD&to=...  — liste/recherche (historique)
  router.get("/", async (req, res) => {
    const params = [];
    const filters = [];
    const scoped = scopeClause(req.user, params);
    if (scoped.where) filters.push(scoped.where);

    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      filters.push(`c.reference_client ILIKE $${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      filters.push(`c.date_creation >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      filters.push(`c.date_creation <= $${params.length}`);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const r = await pool.query(
      `SELECT c.*, u.nom AS vendeur_nom, s.nom AS site_nom,
              COALESCE(cc.n, 0) AS nb_chassis
         FROM chantiers c
         JOIN users u ON u.id = c.user_id
         JOIN sites s ON s.id = c.site_id
         LEFT JOIN (SELECT chantier_id, COUNT(*) AS n FROM chassis GROUP BY chantier_id) cc
                ON cc.chantier_id = c.id
         ${whereSql}
         ORDER BY c.date_creation DESC
         LIMIT 200`,
      params
    );
    res.json({ chantiers: r.rows });
  });

  // GET /api/chantiers/:id — détail + châssis + recalcul du débitage par le moteur
  router.get("/:id", async (req, res) => {
    const chantier = await loadVisible(pool, req.user, req.params.id);
    if (!chantier) return res.status(404).json({ error: "Chantier introuvable" });

    const ch = await pool.query(
      "SELECT * FROM chassis WHERE chantier_id = $1 ORDER BY repere",
      [chantier.id]
    );
    const lot = ch.rows.map(toMoteur);
    const resultats = lot.length ? debiterChantier(lot) : null;
    res.json({ chantier, chassis: ch.rows, resultats });
  });

  // POST /api/chantiers — { reference_client, statut?, chassis: [...] }
  router.post("/", async (req, res) => {
    const { reference_client, statut = "brouillon", chassis = [] } = req.body || {};
    if (!Array.isArray(chassis) || chassis.length === 0) {
      return res.status(400).json({ error: "Au moins un châssis requis" });
    }
    // Valide les cotes via le moteur (lève si config inconnue / lot vide).
    try {
      debiterChantier(chassis.map(normalizeChassisInput));
    } catch (e) {
      return res.status(400).json({ error: `Châssis invalide : ${e.message}` });
    }

    const cr = await pool.query(
      "INSERT INTO chantiers (site_id, user_id, reference_client, statut) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.site_id, req.user.id, reference_client || null, statut]
    );
    const chantier = cr.rows[0];

    let repere = 1;
    for (const c of chassis) {
      await pool.query(
        `INSERT INTO chassis (chantier_id, repere, gamme, config, type_ouvrage, largeur, hauteur, quantite, coloris)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [chantier.id, repere++, c.gamme || "ulysse70", c.config, c.type, c.L, c.H, c.Q || 1, c.color || null]
      );
    }
    res.status(201).json({ chantier });
  });

  // PATCH /api/chantiers/:id — maj référence/statut (remplacement des châssis optionnel)
  router.patch("/:id", async (req, res) => {
    const chantier = await loadVisible(pool, req.user, req.params.id);
    if (!chantier) return res.status(404).json({ error: "Chantier introuvable" });

    const { reference_client, statut, chassis } = req.body || {};
    const r = await pool.query(
      `UPDATE chantiers SET
         reference_client = COALESCE($2, reference_client),
         statut           = COALESCE($3, statut)
       WHERE id = $1 RETURNING *`,
      [chantier.id, reference_client ?? null, statut ?? null]
    );

    if (Array.isArray(chassis)) {
      try {
        debiterChantier(chassis.map(normalizeChassisInput));
      } catch (e) {
        return res.status(400).json({ error: `Châssis invalide : ${e.message}` });
      }
      await pool.query("DELETE FROM chassis WHERE chantier_id = $1", [chantier.id]);
      let repere = 1;
      for (const c of chassis) {
        await pool.query(
          `INSERT INTO chassis (chantier_id, repere, gamme, config, type_ouvrage, largeur, hauteur, quantite, coloris)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [chantier.id, repere++, c.gamme || "ulysse70", c.config, c.type, c.L, c.H, c.Q || 1, c.color || null]
        );
      }
    }
    res.json({ chantier: r.rows[0] });
  });

  // DELETE /api/chantiers/:id
  router.delete("/:id", async (req, res) => {
    const chantier = await loadVisible(pool, req.user, req.params.id);
    if (!chantier) return res.status(404).json({ error: "Chantier introuvable" });
    await pool.query("DELETE FROM chassis WHERE chantier_id = $1", [chantier.id]);
    await pool.query("DELETE FROM chantiers WHERE id = $1", [chantier.id]);
    res.status(204).end();
  });

  return router;
};

// Normalise une entrée frontend (L/H/Q peuvent arriver en chaîne) vers le moteur.
function normalizeChassisInput(c) {
  return {
    gamme: c.gamme || "ulysse70",
    config: c.config,
    type: c.type,
    L: Number(c.L),
    H: Number(c.H),
    Q: Number(c.Q) || 1,
    color: c.color || "",
  };
}

// Charge un chantier en respectant la visibilité du rôle.
async function loadVisible(pool, user, id) {
  const r = await pool.query("SELECT * FROM chantiers WHERE id = $1", [id]);
  const chantier = r.rows[0];
  if (!chantier) return null;
  if (user.role === "admin") return chantier;
  if (user.role === "responsable") return chantier.site_id === user.site_id ? chantier : null;
  return chantier.user_id === user.id ? chantier : null;
}
