const express = require("express");

module.exports = function statsRoutes(pool, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  router.get("/", async (req, res) => {
    const tid = req.user.tenant_id;

    // ---- Chantiers ----
    const [chanTotal, chanMois, chanGamemes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS n FROM chantiers c
         JOIN users u ON u.id = c.user_id WHERE u.tenant_id = $1`,
        [tid]
      ),
      pool.query(
        `SELECT TO_CHAR(c.date_creation, 'YYYY-MM') AS mois, COUNT(*) AS n
         FROM chantiers c JOIN users u ON u.id = c.user_id
         WHERE u.tenant_id = $1 AND c.date_creation >= NOW() - INTERVAL '12 months'
         GROUP BY mois ORDER BY mois`,
        [tid]
      ),
      pool.query(
        `SELECT ch.gamme, COUNT(*) AS n, SUM(ch.quantite) AS total_chassis
         FROM chassis ch
         JOIN chantiers c ON c.id = ch.chantier_id
         JOIN users u ON u.id = c.user_id
         WHERE u.tenant_id = $1
         GROUP BY ch.gamme ORDER BY total_chassis DESC`,
        [tid]
      ),
    ]);

    // ---- Devis ----
    const [devisStatuts, topClients, devisRows] = await Promise.all([
      pool.query(
        `SELECT statut, COUNT(*) AS n, COALESCE(SUM(montant_ht), 0) AS montant
         FROM devis WHERE tenant_id = $1 GROUP BY statut`,
        [tid]
      ),
      pool.query(
        `SELECT client_nom, COUNT(*) AS n, COALESCE(SUM(montant_ht), 0) AS montant
         FROM devis WHERE tenant_id = $1 AND client_nom IS NOT NULL AND client_nom <> ''
         GROUP BY client_nom ORDER BY montant DESC LIMIT 10`,
        [tid]
      ),
      pool.query(
        `SELECT results_json FROM devis WHERE tenant_id = $1 AND results_json <> '{}'`,
        [tid]
      ),
    ]);

    // ---- Profils & accessoires depuis results_json ----
    const profilsMap = {};
    const accMap = {};
    for (const row of devisRows.rows) {
      try {
        const r = JSON.parse(row.results_json);
        for (const [ref, { bars, barre }] of Object.entries(r.optim || {})) {
          if (!profilsMap[ref]) profilsMap[ref] = { ref, barres: 0, metrage: 0 };
          profilsMap[ref].barres += bars.length;
          profilsMap[ref].metrage = +(profilsMap[ref].metrage + bars.length * barre / 1000).toFixed(2);
        }
        for (const a of r.accessoires || []) {
          if (!accMap[a.ref]) accMap[a.ref] = { ref: a.ref, des: a.des, qte: 0 };
          accMap[a.ref].qte += a.qte;
        }
      } catch { /* résultat corrompu — ignorer */ }
    }

    const devisTotaux = devisStatuts.rows.reduce(
      (acc, r) => ({ n: acc.n + Number(r.n), montant: acc.montant + Number(r.montant) }),
      { n: 0, montant: 0 }
    );
    const confirme = devisStatuts.rows.find(r => r.statut === "confirmé");

    res.json({
      chantiers: {
        total:  Number(chanTotal.rows[0].n),
        parMois: chanMois.rows.map(r => ({ mois: r.mois, n: Number(r.n) })),
      },
      gammes: chanGamemes.rows.map(r => ({
        gamme: r.gamme, n: Number(r.n), total: Number(r.total_chassis),
      })),
      devis: {
        total:        devisTotaux.n,
        montant_total: +devisTotaux.montant.toFixed(2),
        ca_confirme:  confirme ? +Number(confirme.montant).toFixed(2) : 0,
        taux_conversion: devisTotaux.n > 0
          ? +((Number(confirme?.n || 0) / devisTotaux.n) * 100).toFixed(1)
          : 0,
        parStatut: devisStatuts.rows.map(r => ({
          statut: r.statut, n: Number(r.n), montant: +Number(r.montant).toFixed(2),
        })),
      },
      topClients: topClients.rows.map(r => ({
        nom: r.client_nom, n: Number(r.n), montant: +Number(r.montant).toFixed(2),
      })),
      topProfils: Object.values(profilsMap)
        .sort((a, b) => b.barres - a.barres).slice(0, 10),
      topAccessoires: Object.values(accMap)
        .sort((a, b) => b.qte - a.qte).slice(0, 10),
    });
  });

  return router;
};
