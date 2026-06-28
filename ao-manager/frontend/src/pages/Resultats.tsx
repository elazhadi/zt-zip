import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resultatApi } from '../lib/api'
import { DOMAINES } from '../types'
import {
  Upload, Trophy, Users, TrendingUp, BarChart2, Loader2,
  Trash2, AlertTriangle, CheckCircle, Target, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Concurrent {
  rang: number
  nom: string
  offre_ht: number
  pct_estimation: number | null
  statut: 'admis' | 'ecarte'
}

interface Resultat {
  id: number
  objet?: string
  maitre_ouvrage?: string
  date_seance?: string
  estimation_mo?: number
  concurrents: Concurrent[]
  mieux_disant_nom?: string
  mieux_disant_offre?: number
  mieux_disant_pct?: number
  created_at: string
}

function UploadZone({ onResult }: { onResult: (r: any) => void }) {
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return
    setLoading(true)
    try {
      const result = await resultatApi.uploadImage(files[0])
      onResult(result)
      toast.success('Résultats extraits avec succès')
    } catch {
      toast.error("Erreur lors de l'analyse de l'image")
    } finally {
      setLoading(false)
    }
  }, [onResult])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50',
        loading && 'opacity-60 pointer-events-none'
      )}
    >
      <input {...getInputProps()} />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary-600" size={40} />
          <p className="text-sm text-gray-600 font-medium">Analyse IA en cours...</p>
          <p className="text-xs text-gray-400">Extraction des concurrents et calcul du classement</p>
        </div>
      ) : (
        <>
          <Upload className="mx-auto mb-3 text-gray-400" size={36} />
          <p className="text-sm font-medium text-gray-700">Déposez la capture d'écran des résultats</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — page de résultats d'ouverture des plis</p>
        </>
      )}
    </div>
  )
}

function ResultatCard({ r, onDelete }: { r: Resultat; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const admis = (r.concurrents || []).filter(c => c.statut === 'admis')
  const ecartes = (r.concurrents || []).filter(c => c.statut === 'ecarte')

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{r.objet || 'Sans objet'}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {r.maitre_ouvrage && <span>{r.maitre_ouvrage}</span>}
            {r.date_seance && <span>• {r.date_seance}</span>}
            <span>• {admis.length} admis {ecartes.length > 0 ? `/ ${ecartes.length} écarté(s)` : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-700">
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button onClick={onDelete} className="text-gray-300 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {r.estimation_mo && (
        <div className="mt-2 text-xs text-gray-500">
          Estimation MO : <strong className="text-gray-800">{r.estimation_mo.toLocaleString('fr-MA')} DH</strong>
        </div>
      )}

      {r.mieux_disant_nom && (
        <div className="mt-2 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
          <Trophy size={14} className="text-green-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-green-800">
            Mieux disant : {r.mieux_disant_nom}
            {r.mieux_disant_offre && ` — ${r.mieux_disant_offre.toLocaleString('fr-MA')} DH`}
            {r.mieux_disant_pct && ` (${r.mieux_disant_pct.toFixed(1)}%)`}
          </span>
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Rang</th>
                <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Concurrent</th>
                <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Offre HT (DH)</th>
                <th className="text-right px-2 py-1.5 text-gray-500 font-medium">% Estimation</th>
                <th className="text-center px-2 py-1.5 text-gray-500 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(r.concurrents || []).map((c, i) => (
                <tr key={i} className={clsx(
                  'border-t border-gray-100',
                  c.rang === 1 && c.statut === 'admis' && 'bg-green-50'
                )}>
                  <td className="px-2 py-1.5 font-bold text-center">
                    {c.rang === 1 && c.statut === 'admis'
                      ? <Trophy size={13} className="text-yellow-500 mx-auto" />
                      : c.rang}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-gray-800">{c.nom}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {c.offre_ht ? c.offre_ht.toLocaleString('fr-MA') : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {c.pct_estimation != null ? (
                      <span className={clsx(
                        'font-semibold',
                        c.pct_estimation < 80 ? 'text-red-600' :
                        c.pct_estimation < 90 ? 'text-orange-600' :
                        c.pct_estimation <= 100 ? 'text-green-700' : 'text-gray-600'
                      )}>
                        {c.pct_estimation.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {c.statut === 'admis'
                      ? <CheckCircle size={13} className="text-green-600 mx-auto" />
                      : <AlertTriangle size={13} className="text-red-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RecommandationPanel() {
  const [estimation, setEstimation] = useState('')
  const [domaine, setDomaine] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleRecommander = async () => {
    if (!estimation) return
    setLoading(true)
    try {
      const r = await resultatApi.recommander(parseFloat(estimation), domaine)
      setResult(r)
    } catch {
      toast.error('Erreur lors de la recommandation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Target size={16} className="text-primary-600" />
        Recommandation d'offre
      </h2>
      <div className="space-y-3">
        <div>
          <label className="label text-xs">Estimation MO (DH HT)</label>
          <input
            className="input text-sm"
            type="number"
            placeholder="ex: 5000000"
            value={estimation}
            onChange={e => setEstimation(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Domaine (optionnel)</label>
          <select className="input text-sm" value={domaine} onChange={e => setDomaine(e.target.value)}>
            <option value="">Tous les domaines</option>
            {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button
          className="btn btn-primary text-sm w-full"
          onClick={handleRecommander}
          disabled={!estimation || loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          Analyser & Recommander
        </button>
      </div>

      {result && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-center mb-3">
            <p className="text-3xl font-bold text-primary-700">{result.pct_recommande}%</p>
            <p className="text-xs text-gray-500">de l'estimation MO</p>
            {estimation && (
              <p className="text-sm font-semibold text-gray-800 mt-1">
                = {(parseFloat(estimation) * result.pct_recommande / 100).toLocaleString('fr-MA')} DH HT
              </p>
            )}
          </div>
          {result.fourchette_min && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600 text-center mb-2">
              Fourchette : {result.fourchette_min}% — {result.fourchette_max}%
            </div>
          )}
          <div className="flex items-center gap-1 mb-2">
            <span className={clsx(
              'badge text-xs',
              result.confiance === 'élevée' ? 'bg-green-100 text-green-700' :
              result.confiance === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            )}>
              Confiance : {result.confiance}
            </span>
          </div>
          {result.explication && (
            <p className="text-xs text-gray-600 italic">{result.explication}</p>
          )}
          {result.concurrents_frequents?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Concurrents fréquents :</p>
              <div className="flex flex-wrap gap-1">
                {result.concurrents_frequents.map((n: string, i: number) => (
                  <span key={i} className="badge bg-orange-100 text-orange-700 text-xs">{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Resultats() {
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState<any>(null)
  const [tab, setTab] = useState<'upload' | 'base' | 'stats'>('upload')

  const { data: resultats = [] } = useQuery<Resultat[]>({
    queryKey: ['resultats'],
    queryFn: () => resultatApi.list(),
  })

  const { data: stats } = useQuery({
    queryKey: ['resultats-stats'],
    queryFn: resultatApi.stats,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => resultatApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resultats'] })
      queryClient.invalidateQueries({ queryKey: ['resultats-stats'] })
      toast.success('Résultat supprimé')
    },
  })

  const handleResult = (r: any) => {
    setLastResult(r)
    queryClient.invalidateQueries({ queryKey: ['resultats'] })
    queryClient.invalidateQueries({ queryKey: ['resultats-stats'] })
    setTab('base')
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BarChart2 size={22} className="text-primary-600" />
        Résultats & Intelligence concurrentielle
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'upload', label: 'Analyser capture', icon: Upload },
          { key: 'base', label: `Base (${resultats.length})`, icon: Users },
          { key: 'stats', label: 'Statistiques', icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {tab === 'upload' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <UploadZone onResult={handleResult} />
            {lastResult && (
              <div className="mt-4 card">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  Dernière extraction
                </p>
                <ResultatCard r={lastResult} onDelete={() => setLastResult(null)} />
              </div>
            )}
          </div>
          <div>
            <RecommandationPanel />
          </div>
        </div>
      )}

      {/* Base */}
      {tab === 'base' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            {resultats.length === 0 ? (
              <div className="card text-center py-12">
                <BarChart2 className="mx-auto mb-3 text-gray-300" size={40} />
                <p className="text-gray-500 text-sm">Aucun résultat enregistré</p>
                <p className="text-xs text-gray-400 mt-1">Analysez une capture d'écran pour commencer</p>
                <button className="btn btn-primary mt-4 mx-auto text-sm" onClick={() => setTab('upload')}>
                  Analyser une capture
                </button>
              </div>
            ) : (
              resultats.map(r => (
                <ResultatCard
                  key={r.id}
                  r={r}
                  onDelete={() => deleteMut.mutate(r.id)}
                />
              ))
            )}
          </div>
          <div>
            <RecommandationPanel />
          </div>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-400 mb-1">Résultats analysés</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_resultats}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 mb-1">% moyen des offres</p>
                <p className="text-3xl font-bold text-primary-700">{stats.avg_pct_estimation ?? '—'}%</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 mb-1">Offre min observée</p>
                <p className="text-2xl font-bold text-green-700">{stats.min_pct ?? '—'}%</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-400 mb-1">Offre max observée</p>
                <p className="text-2xl font-bold text-orange-700">{stats.max_pct ?? '—'}%</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users size={16} /> Top concurrents
            </h2>
            {(stats.top_concurrents || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune donnée</p>
            ) : (
              <div className="space-y-2">
                {stats.top_concurrents.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{c.nom}</span>
                    <span className="badge bg-gray-100 text-gray-600 text-xs">{c.participations} AO</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
