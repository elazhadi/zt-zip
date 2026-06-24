const BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "gabarys_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(method, path, body, { isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (isForm) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const msg = (data && data.error) || `Erreur ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  login:          (email, password) => req("POST", "/auth/login", { email, password }),
  me:             () => req("GET", "/auth/me"),
  logout:         () => req("POST", "/auth/logout"),
  register:       (payload) => req("POST", "/auth/register", payload),
  updateProfile:  (data) => req("PATCH", "/auth/profile", data),
  changePassword: (data) => req("POST", "/auth/change-password", data),

  // Sites
  listSites:   () => req("GET", "/sites"),
  createSite:  (data) => req("POST", "/sites", data),
  updateSite:  (id, data) => req("PATCH", `/sites/${id}`, data),

  // Users (admin)
  listUsers:      () => req("GET", "/users"),
  createUser:     (data) => req("POST", "/users", data),
  updateUser:     (id, data) => req("PATCH", `/users/${id}`, data),
  deactivateUser: (id) => req("DELETE", `/users/${id}`),
  getUserGammes:  (id) => req("GET",  `/users/${id}/gammes`),
  setUserGammes:  (id, gamme_ids) => req("PUT", `/users/${id}/gammes`, { gamme_ids }),

  // Tenants (super_admin backoffice)
  listTenants:   () => req("GET", "/tenants"),
  getTenant:     (id) => req("GET", `/tenants/${id}`),
  createTenant:  (data) => req("POST", "/tenants", data),
  updateTenant:  (id, data) => req("PATCH", `/tenants/${id}`, data),

  // Chantiers
  listChantiers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return req("GET", `/chantiers${qs ? `?${qs}` : ""}`);
  },
  getChantier:    (id) => req("GET", `/chantiers/${id}`),
  exportChantiers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString()
    return req("GET", `/chantiers/export${qs ? `?${qs}` : ''}`)
  },
  createChantier: (payload) => req("POST", "/chantiers", payload),
  updateChantier: (id, payload) => req("PATCH", `/chantiers/${id}`, payload),
  deleteChantier: (id) => req("DELETE", `/chantiers/${id}`),

  // Débitage côté serveur
  debiter: (chassis) => req("POST", "/debitage", { chassis }),

  // Lecture croquis (photo → vision → pré-remplissage)
  lireCroquis: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return req("POST", "/vision/lire", fd, { isForm: true });
  },

  // Coloris
  listColoris:   ()            => req("GET",    "/coloris"),
  addColoris:    (code, nom)   => req("POST",   "/coloris", { code, nom }),
  updateColoris: (id, nom)     => req("PATCH",  `/coloris/${id}`, { nom }),
  deleteColoris: (id)          => req("DELETE", `/coloris/${id}`),

  // Gammes
  listGammes:   () => req("GET", "/gammes"),
  getCatalogue: () => req("GET", "/gammes/catalogue"),

  // Tarifs
  listTarifs:     ()           => req("GET",    "/tarifs"),
  createTarif:    (nom)        => req("POST",   "/tarifs", { nom }),
  updateTarif:    (id, data)   => req("PATCH",  `/tarifs/${id}`, data),
  deleteTarif:    (id)         => req("DELETE", `/tarifs/${id}`),
  getTarifLignes: (id)         => req("GET",    `/tarifs/${id}/lignes`),
  setTarifLignes: (id, lignes, merge = false) => req("PUT", `/tarifs/${id}/lignes${merge ? '?mode=merge' : ''}`, { lignes }),

  // Devis
  listDevis:   ()         => req("GET",    "/devis"),
  createDevis: (data)     => req("POST",   "/devis", data),
  getDevis:    (id)       => req("GET",    `/devis/${id}`),
  updateDevis: (id, data) => req("PATCH",  `/devis/${id}`, data),
  deleteDevis: (id)       => req("DELETE", `/devis/${id}`),

  // Stats
  getStats: () => req("GET", "/stats"),

  health: () => req("GET", "/health"),
};
