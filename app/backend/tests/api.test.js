/**
 * Tests d'intégration API ULYSSE 70.
 * Utilise pg-mem (PostgreSQL en mémoire) + supertest — aucun Docker requis.
 * Lancer : npm test (depuis app/backend)
 */
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const { newDb, DataType } = require("pg-mem");

const { createApp } = require("../src/app");
const { migrate } = require("../src/db/migrate");
const { seed } = require("../src/db/seed");

// Construit une app fraîche sur une base pg-mem isolée + client vision mocké.
async function makeApp() {
  const db = newDb();
  // pg-mem fournit now() ; on le (re)déclare explicitement pour les DEFAULT now().
  db.public.registerFunction({
    name: "now",
    returns: DataType.timestamp,
    implementation: () => new Date(),
    impure: true,
  });
  const pg = db.adapters.createPg();
  const pool = new pg.Pool();
  await migrate(pool);

  // Client vision factice : renvoie un JSON de croquis sans appel réseau.
  const visionClient = {
    available: true,
    model: "mock",
    _callModel: async () =>
      JSON.stringify({
        chassis: [
          { largeur_mm: 2895, hauteur_mm: 2500, vantaux: 3, rails: 3, quantite: 1,
            confiance: { largeur: 0.9, hauteur: 0.9, vantaux: 0.7, rails: 0.5 },
            config_suggeree: null, annotations: "passage libre 1250" },
        ],
        avertissements: [],
      }),
  };

  const app = createApp({ pool, visionClient, corsOrigin: "*" });
  const seedInfo = await seed(pool, { adminEmail: "admin@test.local", adminPass: "secret123" });
  return { app, pool, seedInfo };
}

async function loginAdmin(app) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@test.local", password: "secret123" });
  assert.strictEqual(res.status, 200, "login admin");
  return res.body.token;
}

test("health endpoint signale la vision active", async () => {
  const { app } = await makeApp();
  const res = await request(app).get("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.vision, true);
});

test("login refuse de mauvais identifiants", async () => {
  const { app } = await makeApp();
  const res = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "faux" });
  assert.strictEqual(res.status, 401);
});

test("login admin renvoie un token et /me le décode", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.role, "admin");
});

test("endpoints protégés refusent sans token", async () => {
  const { app } = await makeApp();
  const res = await request(app).get("/api/chantiers");
  assert.strictEqual(res.status, 401);
});

test("débitage côté serveur reproduit les valeurs ProGES (3VT/3R)", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const res = await request(app)
    .post("/api/debitage")
    .set("Authorization", `Bearer ${token}`)
    .send({ chassis: [{ config: "3VT/3R", type: "porte", L: 2895, H: 2500, Q: 1, color: "Blanc" }] });
  assert.strictEqual(res.status, 200);
  const rail = res.body.debits[0].lignes.find((l) => l.ref === "6099BIS");
  assert.strictEqual(rail.long, 2809);
  assert.strictEqual(res.body.vitrage[0].larg, 897);
  assert.strictEqual(res.body.vitrage[0].haut, 2336);
});

test("débitage rejette une config inconnue", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const res = await request(app)
    .post("/api/debitage")
    .set("Authorization", `Bearer ${token}`)
    .send({ chassis: [{ config: "9VT/9R", type: "porte", L: 2000, H: 2000, Q: 1 }] });
  assert.strictEqual(res.status, 400);
});

test("cycle de vie chantier : créer → lister → détail (avec recalcul) → supprimer", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);

  const create = await request(app)
    .post("/api/chantiers")
    .set("Authorization", `Bearer ${token}`)
    .send({
      reference_client: "DVYP26176",
      chassis: [
        { config: "3VT/3R", type: "porte", L: 2895, H: 2500, Q: 1, color: "Blanc" },
        { config: "3VT/3R", type: "porte", L: 2870, H: 2480, Q: 1, color: "Blanc" },
      ],
    });
  assert.strictEqual(create.status, 201);
  const id = create.body.chantier.id;

  const list = await request(app).get("/api/chantiers").set("Authorization", `Bearer ${token}`);
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.chantiers.some((c) => c.id === id), "chantier listé");

  const search = await request(app)
    .get("/api/chantiers?q=DVYP")
    .set("Authorization", `Bearer ${token}`);
  assert.ok(search.body.chantiers.length >= 1, "recherche par référence");

  const detail = await request(app).get(`/api/chantiers/${id}`).set("Authorization", `Bearer ${token}`);
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.body.chassis.length, 2);
  // Recalcul moteur : le chantier DVYP26176 = 18 barres (valeur ProGES).
  assert.strictEqual(detail.body.resultats.stats.barres, 18);

  const del = await request(app).delete(`/api/chantiers/${id}`).set("Authorization", `Bearer ${token}`);
  assert.strictEqual(del.status, 204);
  const after = await request(app).get(`/api/chantiers/${id}`).set("Authorization", `Bearer ${token}`);
  assert.strictEqual(after.status, 404);
});

test("isolation des rôles : un vendeur ne voit pas les chantiers d'un autre", async () => {
  const { app } = await makeApp();
  const adminToken = await loginAdmin(app);

  // Crée deux vendeurs.
  for (const v of [
    { nom: "Vendeur A", email: "a@test.local", password: "passA123" },
    { nom: "Vendeur B", email: "b@test.local", password: "passB123" },
  ]) {
    const r = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...v, role: "vendeur", site_id: 1 });
    assert.strictEqual(r.status, 201, `register ${v.email}`);
  }

  const loginA = await request(app).post("/api/auth/login").send({ email: "a@test.local", password: "passA123" });
  const loginB = await request(app).post("/api/auth/login").send({ email: "b@test.local", password: "passB123" });
  const tokenA = loginA.body.token;
  const tokenB = loginB.body.token;

  const created = await request(app)
    .post("/api/chantiers")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ reference_client: "PRIVE-A", chassis: [{ config: "2VT/2R", type: "fenetre", L: 1800, H: 1500, Q: 1 }] });
  assert.strictEqual(created.status, 201);
  const idA = created.body.chantier.id;

  // B ne voit pas le chantier de A.
  const listB = await request(app).get("/api/chantiers").set("Authorization", `Bearer ${tokenB}`);
  assert.ok(!listB.body.chantiers.some((c) => c.id === idA), "B ne voit pas le chantier de A");
  const detailB = await request(app).get(`/api/chantiers/${idA}`).set("Authorization", `Bearer ${tokenB}`);
  assert.strictEqual(detailB.status, 404);

  // L'admin voit tout.
  const listAdmin = await request(app).get("/api/chantiers").set("Authorization", `Bearer ${adminToken}`);
  assert.ok(listAdmin.body.chantiers.some((c) => c.id === idA), "admin voit le chantier de A");
});

test("liste des gammes exposée et ULYSSE 70 présente", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const res = await request(app).get("/api/gammes").set("Authorization", `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.gammes.some((g) => g.id === "ulysse70"), "ULYSSE 70 listée");
});

test("la gamme d'un châssis est persistée et relue", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const create = await request(app)
    .post("/api/chantiers")
    .set("Authorization", `Bearer ${token}`)
    .send({ reference_client: "G1", chassis: [{ gamme: "ulysse70", config: "3VT/3R", type: "porte", L: 2895, H: 2500, Q: 1 }] });
  assert.strictEqual(create.status, 201);
  const detail = await request(app)
    .get(`/api/chantiers/${create.body.chantier.id}`)
    .set("Authorization", `Bearer ${token}`);
  assert.strictEqual(detail.body.chassis[0].gamme, "ulysse70");
  assert.strictEqual(detail.body.resultats.vitrage[0].gamme, "ulysse70");
});

test("lecture croquis (vision mockée) pré-remplit et déduit la config", async () => {
  const { app } = await makeApp();
  const token = await loginAdmin(app);
  const res = await request(app)
    .post("/api/vision/lire")
    .set("Authorization", `Bearer ${token}`)
    .attach("image", Buffer.from("fake-jpeg-bytes"), { filename: "croquis.jpg", contentType: "image/jpeg" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.chassis.length, 1);
  // 3 vantaux / 3 rails → config déduite côté backend.
  assert.strictEqual(res.body.chassis[0].config_suggeree, "3VT/3R");
  assert.match(res.body.message, /Vérifiez/);
});
