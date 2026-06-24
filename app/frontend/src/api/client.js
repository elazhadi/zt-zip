// Client API léger pour le backend ULYSSE 70.
// L'URL de base vient de VITE_API_URL (défaut : /api, proxifié par nginx en prod
// ou par le proxy Vite en dev).
const BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "ulysse70_token";

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
    payload = body; // FormData : ne pas fixer Content-Type (le navigateur s'en charge)
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
  login: (email, password) => req("POST", "/auth/login", { email, password }),
  me: () => req("GET", "/auth/me"),
  register: (payload) => req("POST", "/auth/register", payload),

  // Sites
  listSites: () => req("GET", "/sites"),

  // Chantiers (historique)
  listChantiers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return req("GET", `/chantiers${qs ? `?${qs}` : ""}`);
  },
  getChantier: (id) => req("GET", `/chantiers/${id}`),
  createChantier: (payload) => req("POST", "/chantiers", payload),
  updateChantier: (id, payload) => req("PATCH", `/chantiers/${id}`, payload),
  deleteChantier: (id) => req("DELETE", `/chantiers/${id}`),

  // Débitage côté serveur (recalcul fiable)
  debiter: (chassis) => req("POST", "/debitage", { chassis }),

  // Lecture croquis (photo → vision → pré-remplissage)
  lireCroquis: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return req("POST", "/vision/lire", fd, { isForm: true });
  },

  health: () => req("GET", "/health"),
};
