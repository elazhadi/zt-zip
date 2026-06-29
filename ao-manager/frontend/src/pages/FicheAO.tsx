import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aoApi, reponseApi, societeApi } from '../lib/api'
import type { AppelOffre, Reponse, Societe } from '../types'
import { STATUT_CONFIG } from '../types'
import {
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, FileDown,
  Building2, Calendar, Tag, Loader2, ExternalLink, Clock
} from 'lucide-react'
import { fmtNum, fmtDate } from '../lib/format'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

export default function FicheAO() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showMaintien, setShowMaintien] = useState(false)
  const [maintienData, setMaintienData] = useState({ date_ouverture_plis: '', duree_jours: 30 })
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  const { data: ao, isLoading } = useQuery<AppelOffre>({
    queryKey: ['ao', id],
    queryFn: () => aoApi.get(Number(id)),
    enabled: !!id,
  })

  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: () => societeApi.list(),
  })

  const { data: reponses = [] } = useQuery<Reponse[]>({
    queryKey: ['reponses', id],
    queryFn: () => reponseApi.listByAO(Number(id)),
    enabled: !!id,
  })

  const decisionMut = useMutation({
    mutationFn: ({ decision, motif }: { decision: string; motif?: string }) =>
      aoApi.setDecision(Number(id), decision, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ao', id] })
      toast.success('Décision mise à jour')
    },
  })

  const statutMut = useMutation({
    mutationFn: (statut: string) => aoApi.setStatut(Number(id), statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ao', id] })
      toast.success('Statut mis à jour')
    },
  })

  const urlMut = useMutation({
    mutationFn: (url: string) => aoApi.update(Number(id), { url_portail: url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ao', id] })
      setEditingUrl(false)
      toast.success('URL mise à jour')
    },
  })

  const maintienMut = useMutation({
    mutationFn: ({ reponseId, data }: { reponseId: number; data: unknown }) =>
      reponseApi.generateMaintien(reponseId, data),
    onSuccess: () => {
      toast.success('Lettre de maintien générée')
      setShowMaintien(false)
    },
  })

  const refusMut = useMutation({
    mutationFn: (reponseId: number) => reponseApi.generateRefus(reponseId),
    onSuccess: () => toast.success('Lettre de refus générée'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary-600" size={32} />
    </div>
  )

  if (!ao) return <div className="text-gray-500">AO introuvable</div>

  const cfg = STATUT_CONFIG[ao.statut]
  const latestReponse = reponses[reponses.length - 1]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="mt-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {ao.reference && <span className="text-xs font-mono text-gray-400">{ao.reference}</span>}
            <span className={clsx('badge', cfg.bg, cfg.color)}>{cfg.label}</span>
            {ao.decision === 'oui' && <span className="badge bg-green-100 text-green-700">Décision : OUI</span>}
            {ao.decision === 'non' && <span className="badge bg-red-100 text-red-700">Décision : NON</span>}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{ao.objet || 'Sans objet'}</h1>
          {/* Portail URL */}
          <div className="mt-2 flex items-center gap-2">
            {!editingUrl && ao.url_portail && (
              <a
                href={ao.url_portail}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline"
              >
                <ExternalLink size={13} />
                Portail marchés publics
              </a>
            )}
            {!editingUrl && (
              <button
                className="text-xs text-gray-400 hover:text-gray-600"
                onClick={() => { setUrlValue(ao.url_portail || ''); setEditingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 50) }}
              >
                {ao.url_portail ? 'Modifier URL' : '+ Ajouter URL portail'}
              </button>
            )}
            {editingUrl && (
              <div className="flex items-center gap-2 flex-1">
                <input
                  ref={urlInputRef}
                  className="input text-xs py-1 flex-1"
                  placeholder="https://www.marchespublics.gov.ma/..."
                  value={urlValue}
                  onChange={e => setUrlValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') urlMut.mutate(urlValue); if (e.key === 'Escape') setEditingUrl(false) }}
                />
                <button className="btn btn-primary py-1 text-xs" onClick={() => urlMut.mutate(urlValue)} disabled={urlMut.isPending}>
                  Enregistrer
                </button>
                <button className="btn btn-secondary py-1 text-xs" onClick={() => setEditingUrl(false)}>Annuler</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main info */}
        <div className="col-span-2 space-y-5">
          {/* Maître d'ouvrage */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 size={16} /> Maître d'ouvrage
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" value={ao.maitre_ouvrage?.nom} />
              <Field label="Ville" value={ao.maitre_ouvrage?.ville} />
              <Field label="Type" value={ao.maitre_ouvrage?.type} />
              <Field label="Adresse" value={ao.maitre_ouvrage?.adresse} />
            </div>
          </div>

          {/* Données marché */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag size={16} /> Données marché
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Domaine" value={ao.domaine} />
              <Field label="Procédure" value={ao.procedure} />
              <Field label="Estimation MO" value={ao.estimation ? `${fmtNum(ao.estimation)} DH` : undefined} />
              <Field label="Caution provisoire" value={ao.caution_provisoire ? `${fmtNum(ao.caution_provisoire)} DH` : undefined} />
              <Field label="Délai exécution" value={(ao.delai_execution as any)?.valeur != null ? `${(ao.delai_execution as any).valeur} ${(ao.delai_execution as any).unite}` : undefined} />
              <Field label="Délai garantie" value={(ao.delai_garantie as any)?.valeur != null ? `${(ao.delai_garantie as any).valeur} ${(ao.delai_garantie as any).unite}` : undefined} />
              <Field label="Lieu de réalisation" value={ao.lieu_realisation} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ao.reserve_tpme && <span className="badge bg-purple-100 text-purple-700">Réservé TPME</span>}
              {ao.prospectus_exige && <span className="badge bg-blue-100 text-blue-700">Prospectus exigé</span>}
              {ao.echantillon_exige && <span className="badge bg-orange-100 text-orange-700">Échantillon exigé</span>}
              {ao.offre_technique_exigee && <span className="badge bg-cyan-100 text-cyan-700">Offre technique</span>}
            </div>
          </div>

          {/* Lots */}
          {ao.lots && ao.lots.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Lots / Articles</h2>
              {ao.lots.map((lot, li) => (
                <div key={li} className="mb-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Lot {lot.numero} — {lot.designation}</p>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-gray-500 font-medium">#</th>
                        <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Désignation</th>
                        <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Qté</th>
                        <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Unité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot.articles.map((art, ai) => (
                        <tr key={ai} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 font-mono">{art.numero}</td>
                          <td className="px-2 py-1.5 text-gray-700">{art.designation}</td>
                          <td className="px-2 py-1.5 text-right">{art.quantite}</td>
                          <td className="px-2 py-1.5 text-gray-500">{art.unite}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Critères de notation */}
          {ao.criteres_notation && ao.criteres_notation.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Critères de notation</h2>
              {ao.criteres_notation.map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {c.poids}%
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.critere}</p>
                    {c.details && <p className="text-xs text-gray-500">{c.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Réponses */}
          {reponses.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileDown size={16} /> Réponses générées
              </h2>
              {reponses.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700">
                      {r.montant_ht ? `${r.montant_ht.toLocaleString('fr-MA')} DH HT` : '—'}
                      {r.pct_estimation ? ` (${r.pct_estimation}%)` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-MA')}</p>
                  </div>
                  <div className="flex gap-2">
                    {r.zip_path && (
                      <a href={reponseApi.downloadZip(r.id)} className="btn btn-secondary text-xs py-1 px-2" download>
                        ZIP
                      </a>
                    )}
                    <button
                      className="btn btn-secondary text-xs py-1 px-2"
                      onClick={() => { setShowMaintien(true) }}
                    >
                      Maintien
                    </button>
                    <button
                      className="btn btn-secondary text-xs py-1 px-2"
                      onClick={() => refusMut.mutate(r.id)}
                      disabled={refusMut.isPending}
                    >
                      Refus maintien
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar size={16} /> Calendrier
            </h2>
            <div className="space-y-2">
              {ao.date_limite && (
                <div className={clsx(
                  'flex items-center gap-2 text-sm',
                  new Date(ao.date_limite.replace(' ', 'T')).getTime() - Date.now() < 3 * 24 * 3600 * 1000
                    ? 'text-warning-600 font-medium' : 'text-gray-700'
                )}>
                  <Clock size={14} />
                  <span>Limite : {fmtDate(ao.date_limite, true)}</span>
                </div>
              )}
              <p className="text-xs text-gray-400">Créé le {new Date(ao.created_at).toLocaleDateString('fr-MA')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Actions</h2>
            <div className="space-y-2">
              <div>
                <label className="label text-xs">Changer le statut</label>
                <select
                  className="input text-sm"
                  value={ao.statut}
                  onChange={e => statutMut.mutate(e.target.value)}
                >
                  {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label className="label text-xs">Société soumissionnaire</label>
                <select
                  className="input text-sm"
                  value={ao.societe_soumissionnaire_id ?? ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value) : null
                    aoApi.update(Number(id), { societe_soumissionnaire_id: val }).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['ao', id] })
                      queryClient.invalidateQueries({ queryKey: ['aos'] })
                    })
                  }}
                >
                  <option value="">— Non associée —</option>
                  {societes.map(s => (
                    <option key={s.id} value={s.id}>{s.code} — {s.raison_sociale}</option>
                  ))}
                </select>
              </div>

              {!ao.decision && (
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                    onClick={() => decisionMut.mutate({ decision: 'oui' })}
                  >
                    <CheckCircle size={13} /> Oui
                  </button>
                  <button
                    className="btn btn-danger text-xs flex-1 flex items-center justify-center gap-1"
                    onClick={() => decisionMut.mutate({ decision: 'non' })}
                  >
                    <XCircle size={13} /> Non
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {ao.notes && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{ao.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Maintien modal */}
      {showMaintien && latestReponse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-96">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Lettre de maintien d'offre</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Date d'ouverture des plis</label>
                <input
                  className="input"
                  type="date"
                  value={maintienData.date_ouverture_plis}
                  onChange={e => setMaintienData({ ...maintienData, date_ouverture_plis: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Durée de maintien (jours)</label>
                <input
                  className="input"
                  type="number"
                  value={maintienData.duree_jours}
                  onChange={e => setMaintienData({ ...maintienData, duree_jours: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                className="btn btn-primary"
                onClick={() => maintienMut.mutate({ reponseId: latestReponse.id, data: maintienData })}
                disabled={!maintienData.date_ouverture_plis || maintienMut.isPending}
              >
                Générer
              </button>
              <button className="btn btn-secondary" onClick={() => setShowMaintien(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
