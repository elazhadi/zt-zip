const express = require("express");
const M = require("@ulysse70/moteur");

const { debiterChantier } = M;

// Clause de visibilité selon rôle + tenant.
function scopeClause(user, params) {
  if (user.role === "super_admin") return { where: "", params };
  params.push(user.tenant_id);
  const tenantFilter = `s.tenant_id = $${params.length}`;
  if (user.role === "admin") return { where: tenantFilter, params };
  if (user.role === "responsable") {
    params.push(user.site_id);
    return { where: `${tenantFilter} AND c.site_id = $${params.length}`, params };
  }
  params.push(user.id);
  return { where: `${tenantFilter} AND c.user_id = $${params.length}`, params };
}

function toMoteur(row) {
  return {
    gamme:  row.gamme || "ulysse70",
    config: row.config,
    type:   row.type_ouvrage,
    L:      row.largeur,
    H:      row.hauteur,
    Q:      row.quantite,
    color:  row.coloris || "",
    ...(row.renforce == null ? {} : { renforce: row.renforce }),
  };
}

module.exports = function chantiersRoutes(pool, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  // GET /api/chantiers?q=ref&from=YYYY-MM-DD&to=...
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

  // GET /api/chantiers/export?gamme=&from=&to=  — export brut chantiers+chassis
  router.get("/export", async (req, res) => {
    const params = [];
    const filters = [];
    const scoped = scopeClause(req.user, params);
    if (scoped.where) filters.push(scoped.where);

    if (req.query.gamme) {
      params.push(req.query.gamme);
      filters.push(`ch.gamme = $${params.length}`);
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
      `SELECT c.id, c.reference_client, c.statut, c.date_creation,
              u.nom AS vendeur_nom, s.nom AS site_nom,
              ch.repere, ch.gamme, ch.config, ch.type_ouvrage,
              ch.largeur, ch.hauteur, ch.quantite, ch.coloris, ch.renforce
         FROM chantiers c
         JOIN users u ON u.id = c.user_id
         JOIN sites s ON s.id = c.site_id
         LEFT JOIN chassis ch ON ch.chantier_id = c.id
         ${whereSql}
         ORDER BY c.date_creation DESC, c.id, ch.repere`,
      params
    );

    const map = new Map();
    for (const row of r.rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id, reference_client: row.reference_client, statut: row.statut,
          date_creation: row.date_creation, vendeur_nom: row.vendeur_nom,
          site_nom: row.site_nom, chassis: [],
        });
      }
      if (row.repere != null) {
        map.get(row.id).chassis.push({
          repere: row.repere, gamme: row.gamme, config: row.config,
          type_ouvrage: row.type_ouvrage, largeur: row.largeur,
          hauteur: row.hauteur, quantite: row.quantite, coloris: row.coloris,
          renforce: row.renforce,
        });
      }
    }
    res.json({ chantiers: Array.from(map.values()) });
  });

  // GET /api/chantiers/:id
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

  // POST /api/chantiers
  router.post("/", async (req, res) => {
    const { reference_client, statut = "brouillon", chassis = [] } = req.body || {};
    if (!Array.isArray(chassis) || chassis.length === 0) {
      return res.status(400).json({ error: "Au moins un châssis requis" });
    }
    try {
      debiterChantier(chassis.map(normalizeChassisInput));
    } catch (e) {
      return res.status(400).json({ error: `Châssis invalide : ${e.message}` });
    }

    const cr = await pool.query(
      "INSERT INTO chantiers (site_id, user_id, reference_client, statut) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.user.site_id, req.user.id, reference_client || null, statut]
    );
    const chantier = cr.rows[0];

    let repere = 1;
    for (const c of chassis) {
      await pool.query(
        `INSERT INTO chassis (chantier_id, repere, gamme, config, type_ouvrage, largeur, hauteur, quantite, coloris, renforce)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [chantier.id, repere++, c.gamme || "ulysse70", c.config, c.type, c.L, c.H, c.Q || 1, c.color || null,
         typeof c.renforce === "boolean" ? c.renforce : null]
      );
    }
    res.status(201).json({ chantier });
  });

  // PATCH /api/chantiers/:id
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
          `INSERT INTO chassis (chantier_id, repere, gamme, config, type_ouvrage, largeur, hauteur, quantite, coloris, renforce)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [chantier.id, repere++, c.gamme || "ulysse70", c.config, c.type, c.L, c.H, c.Q || 1, c.color || null,
           typeof c.renforce === "boolean" ? c.renforce : null]
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

function normalizeChassisInput(c) {
  return {
    gamme:  c.gamme || "ulysse70",
    config: c.config,
    type:   c.type,
    L:      Number(c.L),
    H:      Number(c.H),
    Q:      Number(c.Q) || 1,
    color:  c.color || "",
    ...(typeof c.renforce === "boolean" ? { renforce: c.renforce } : {}),
  };
}

// Charge un chantier en respectant la visibilité du rôle et l'isolation tenant.
async function loadVisible(pool, user, id) {
  const r = await pool.query(
    "SELECT c.*, s.tenant_id AS site_tenant_id FROM chantiers c JOIN sites s ON s.id = c.site_id WHERE c.id = $1",
    [id]
  );
  const chantier = r.rows[0];
  if (!chantier) return null;
  if (user.role === "super_admin") return chantier;
  if (Number(chantier.site_tenant_id) !== Number(user.tenant_id)) return null;
  if (user.role === "admin") return chantier;
  if (user.role === "responsable") return chantier.site_id === user.site_id ? chantier : null;
  return chantier.user_id === user.id ? chantier : null;
}
