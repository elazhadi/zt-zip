import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Sociétés
export const societeApi = {
  list: () => api.get('/societes/').then(r => r.data),
  get: (id: number) => api.get(`/societes/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/societes/', data).then(r => r.data),
  update: (id: number, data: unknown) => api.put(`/societes/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/societes/${id}`),
  uploadLogo: (id: number, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/societes/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  uploadEntete: (id: number, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/societes/${id}/entete`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  listDocuments: (id: number) => api.get(`/societes/${id}/documents`).then(r => r.data),
  uploadStatut: (id: number, file: File, date_certification: string) => {
    const fd = new FormData(); fd.append('file', file); fd.append('date_certification', date_certification)
    return api.post(`/societes/${id}/documents/statut`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  uploadAttestation: (id: number, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/societes/${id}/documents/attestation`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

// AOs
export const aoApi = {
  list: (params?: Record<string, string>) => api.get('/aos/', { params }).then(r => r.data),
  get: (id: number) => api.get(`/aos/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/aos/', data).then(r => r.data),
  update: (id: number, data: unknown) => api.put(`/aos/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/aos/${id}`),
  uploadAnalyse: (files: File[]) => {
    const fd = new FormData(); files.forEach(f => fd.append('files', f))
    return api.post('/aos/upload-analyse', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  saveFromAnalyse: (data: unknown) => api.post('/aos/save-from-analyse', data).then(r => r.data),
  setDecision: (id: number, decision: string, motif?: string) =>
    api.put(`/aos/${id}/decision`, { decision, motif }).then(r => r.data),
  setStatut: (id: number, statut: string) =>
    api.put(`/aos/${id}/statut`, { statut }).then(r => r.data),
  pipelineStats: () => api.get('/aos/stats/pipeline').then(r => r.data),
  listConcurrents: (id: number) => api.get(`/aos/${id}/concurrents`).then(r => r.data),
  addConcurrent: (id: number, data: unknown) => api.post(`/aos/${id}/concurrents`, data).then(r => r.data),
}

// Réponses
export const reponseApi = {
  listByAO: (ao_id: number) => api.get(`/reponses/ao/${ao_id}`).then(r => r.data),
  distributePrices: (data: unknown) => api.post('/reponses/distribute-prices', data).then(r => r.data),
  generate: (data: unknown) => api.post('/reponses/generate', data).then(r => r.data),
  downloadZip: (id: number) => `${BASE}/reponses/${id}/download-zip`,
  generateMaintien: (id: number, data: unknown) => api.post(`/reponses/${id}/maintien-offre`, data).then(r => r.data),
  generateRefus: (id: number) => api.post(`/reponses/${id}/refus-maintien`).then(r => r.data),
}

// Marchés
export const marcheApi = {
  list: () => api.get('/marches/').then(r => r.data),
  get: (id: number) => api.get(`/marches/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/marches/', data).then(r => r.data),
  update: (id: number, data: unknown) => api.put(`/marches/${id}`, data).then(r => r.data),
  addEtape: (id: number, data: unknown) => api.post(`/marches/${id}/etape`, data).then(r => r.data),
  uploadDoc: (id: number, file: File, etape: string) => {
    const fd = new FormData(); fd.append('file', file); fd.append('etape', etape)
    return api.post(`/marches/${id}/upload-doc`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  generateCaution: (id: number) => api.post(`/marches/${id}/caution-definitive`).then(r => r.data),
  generateMainLevee: (id: number, date_pv_rd: string) =>
    api.post(`/marches/${id}/main-levee`, { date_pv_rd }).then(r => r.data),
  generateExcel: (id: number, periodicite: string) =>
    api.post(`/marches/${id}/excel-enregistrement`, { periodicite }).then(r => r.data),
  dashboard: (id: number) => api.get(`/marches/${id}/dashboard`).then(r => r.data),
}

// Résultats AO
export const resultatApi = {
  uploadImage: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/resultats/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  list: (domaine?: string) => api.get('/resultats/', { params: domaine ? { domaine } : {} }).then(r => r.data),
  stats: () => api.get('/resultats/stats').then(r => r.data),
  recommander: (estimation: number, domaine?: string) =>
    api.post('/resultats/recommander', null, { params: { estimation, domaine: domaine || '' } }).then(r => r.data),
  update: (id: number, data: unknown) => api.put(`/resultats/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/resultats/${id}`),
}

// Utilisateurs
export const userApi = {
  list: () => api.get('/users/').then(r => r.data),
  create: (data: unknown) => api.post('/users/', data).then(r => r.data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data).then(r => r.data),
  updatePermissions: (id: number, data: unknown) => api.put(`/users/${id}/permissions`, data).then(r => r.data),
  resetPassword: (id: number, nouveau_mdp: string) => api.put(`/users/${id}/reset-password`, { nouveau_mdp }).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
  meta: () => api.get('/users/meta/roles').then(r => r.data),
}

// Documents
export const documentApi = {
  exportDescriptif: (data: unknown) => api.post('/documents/descriptif-fournisseur', data).then(r => r.data),
  verifyProspectus: (ao_id: number, file: File) => {
    const fd = new FormData(); fd.append('ao_id', String(ao_id)); fd.append('file', file)
    return api.post('/documents/prospectus/verify', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  generateProspectus: (data: unknown) => api.post('/documents/prospectus/generate', data).then(r => r.data),
}
