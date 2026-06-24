const bcrypt = require("bcryptjs");

const ABAQUE_ULYSSE70 = {
  gamme: "ULYSSE 70 / PL600",
  source: "Abaque atelier Rock Systems, validé ProGES (DVYP26176)",
  barre_standard_mm: 6030,
  barre_montants_mm: 6600,
  trait_scie_mm: 5,
  configs: [
    "2VT/2R", "3VT/2R", "4VT/2R", "3VT/3R", "6VT/3R", "4VT/4R", "8VT/4R",
  ],
  regles_communes: {
    rail: "L − 86",
    montant_lateral: "H − 70",
    montant_central: "H − 70",
    vitrage_hauteur: "H − 164",
  },
};

// Crée les données minimales : un tenant, un site, un admin et l'entrée d'abaque.
// Idempotent : ne réinsère pas si l'admin existe déjà.
// Le super_admin est créé/vérifié indépendamment à chaque démarrage.
async function seed(pool, opts = {}) {
  const adminEmail = opts.adminEmail || process.env.SEED_ADMIN_EMAIL || "admin@gabarys.local";
  const adminPass  = opts.adminPass  || process.env.SEED_ADMIN_PASSWORD || "admin1234";

  // Super-admin plateforme : vérifié/créé en premier, indépendamment du reste.
  // Permet de créer le super_admin même si le seed normal a déjà tourné.
  const superEmail = opts.superAdminEmail || process.env.SEED_SUPERADMIN_EMAIL;
  const superPass  = opts.superAdminPass  || process.env.SEED_SUPERADMIN_PASSWORD || "superadmin1234";
  if (superEmail) {
    const superExists = await pool.query("SELECT id FROM users WHERE email = $1", [superEmail]);
    if (!superExists.rows.length) {
      // S'assure qu'un tenant par défaut existe pour rattacher le super_admin.
      let defaultTenantId;
      const tenantCheck = await pool.query("SELECT id FROM tenants WHERE slug = 'default'");
      if (tenantCheck.rows.length) {
        defaultTenantId = tenantCheck.rows[0].id;
      } else {
        const t = await pool.query(
          "INSERT INTO tenants (nom, slug, plan, vision_enabled, max_users) VALUES ($1,$2,'trial',TRUE,10) RETURNING id",
          ["Gabarys Demo", "default"]
        );
        defaultTenantId = t.rows[0].id;
      }
      let defaultSiteId;
      const siteCheck = await pool.query("SELECT id FROM sites WHERE tenant_id = $1 LIMIT 1", [defaultTenantId]);
      if (siteCheck.rows.length) {
        defaultSiteId = siteCheck.rows[0].id;
      } else {
        const s = await pool.query(
          "INSERT INTO sites (tenant_id, nom, adresse, actif) VALUES ($1,$2,$3,TRUE) RETURNING id",
          [defaultTenantId, "Comptoir principal", "—"]
        );
        defaultSiteId = s.rows[0].id;
      }
      const superHash = require("bcryptjs").hashSync(superPass, 10);
      await pool.query(
        "INSERT INTO users (tenant_id, site_id, nom, email, hash_mdp, role) VALUES ($1,$2,$3,$4,$5,'super_admin')",
        [defaultTenantId, defaultSiteId, "Super Admin", superEmail, superHash]
      );
    }
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
  if (existing.rows.length) {
    return { created: false, adminEmail };
  }

  // Tenant par défaut.
  const tenantSlug = opts.tenantSlug || "default";
  let tenantId;
  const tenantCheck = await pool.query("SELECT id FROM tenants WHERE slug = $1", [tenantSlug]);
  if (tenantCheck.rows.length) {
    tenantId = tenantCheck.rows[0].id;
  } else {
    const t = await pool.query(
      "INSERT INTO tenants (nom, slug, plan, vision_enabled, max_users) VALUES ($1,$2,'trial',TRUE,10) RETURNING id",
      [opts.tenantNom || "Gabarys Demo", tenantSlug]
    );
    tenantId = t.rows[0].id;
    // Accès à la gamme ulysse70 par défaut.
    await pool.query(
      "INSERT INTO tenant_gammes (tenant_id, gamme_id) VALUES ($1, $2)",
      [tenantId, "ulysse70"]
    );
  }

  const site = await pool.query(
    "INSERT INTO sites (tenant_id, nom, adresse, actif) VALUES ($1,$2,$3,TRUE) RETURNING id",
    [tenantId, "Comptoir principal", "—"]
  );
  const siteId = site.rows[0].id;

  const hash = await bcrypt.hash(adminPass, 10);
  await pool.query(
    "INSERT INTO users (tenant_id, site_id, nom, email, hash_mdp, role) VALUES ($1,$2,$3,$4,$5,'admin')",
    [tenantId, siteId, "Administrateur", adminEmail, hash]
  );

  const abq = await pool.query("SELECT id FROM abaques WHERE gamme = $1", [ABAQUE_ULYSSE70.gamme]);
  if (!abq.rows.length) {
    await pool.query(
      "INSERT INTO abaques (tenant_id, gamme, version, data_json, actif) VALUES ($1,$2,$3,$4,TRUE)",
      [tenantId, ABAQUE_ULYSSE70.gamme, "1.0", JSON.stringify(ABAQUE_ULYSSE70)]
    );
  }

  return { created: true, adminEmail, adminPass, siteId, tenantId };
}

module.exports = { seed, ABAQUE_ULYSSE70 };
