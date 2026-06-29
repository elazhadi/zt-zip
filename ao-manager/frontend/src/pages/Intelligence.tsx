import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aoApi } from '../lib/api'
import type { AppelOffre } from '../types'
import { STATUT_CONFIG, DOMAINES } from '../types'
import { Search, TrendingUp, BarChart2, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import clsx from 'clsx'
import { fmtDate } from '../lib/format'

export default function Intelligence() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [domaine, setDomaine] = useState('')
  const [statut, setStatut] = useState('')
  const [tab, setTab] = useState<'base' | 'stats' | 'concurrents'>('base')

  const { data: aos = [] } = useQuery<AppelOffre[]>({
    queryKey: ['aos'],
    queryFn: () => aoApi.list(),
  })

  const filtered = aos.filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q || (a.objet || '').toLowerCase().includes(q) || (a.reference || '').toLowerCase().includes(q) || (a.maitre_ouvrage?.nom || '').toLowerCase().includes(q)
    const matchD = !domaine || a.domaine === domaine
    const matchS = !statut || a.statut === statut
    return matchQ && matchD && matchS
  })

  // Stats
  const byDomaine = DOMAINES.map(d => ({
    name: d.split(' ')[0] + '...',
    fullName: d,
    count: aos.filter(a => a.domaine === d).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  const winRate = (() => {
    const adjudique = aos.filter(a => ['marche_en_cours', 'en_paiement', 'en_garantie', 'cloture'].includes(a.statut)).length
    const total = aos.filter(a => a.statut !== 'en_instance').length
    return total > 0 ? ((adjudique / total) * 100).toFixed(1) : '0'
  })()

  const totalMontant = aos
    .filter(a => ['marche_en_cours', 'en_paiement', 'en_garantie', 'cloture'].includes(a.statut))
    .reduce((s, a) => s + (a.estimation || 0), 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Intelligence marché</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'base', label: 'Base AO', icon: Search },
          { key: 'stats', label: 'Statistiques', icon: BarChart2 },
          { key: 'concurrents', label: 'Concurrents', icon: Users },
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
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Base AO */}
      {tab === 'base' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Rechercher par objet, référence, maître d'ouvrage..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="input w-48" value={domaine} onChange={e => setDomaine(e.target.value)}>
              <option value="">Tous les domaines</option>
              {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input w-48" value={statut} onChange={e => setStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400 mb-3">{filtered.length} résultat(s)</p>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Référence', 'Objet', 'Maître d\'ouvrage', 'Domaine', 'Statut', 'Date limite', 'Estimation'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Aucun résultat</td>
                  </tr>
                )}
                {filtered.map(a => {
                  const cfg = STATUT_CONFIG[a.statut]
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/ao/${a.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.reference || '—'}</td>
                      <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{a.objet || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.maitre_ouvrage?.nom || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.domaine || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge', cfg.bg, cfg.color)}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fmtDate(a.date_limite)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {a.estimation ? `${(a.estimation / 1000).toFixed(0)}K` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Total AO</p>
              <p className="text-3xl font-bold text-gray-900">{aos.length}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Taux de réussite</p>
              <p className="text-3xl font-bold text-green-700">{winRate}%</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Portefeuille gagné</p>
              <p className="text-xl font-bold text-gray-900">{(totalMontant / 1_000_000).toFixed(1)}M DH</p>
            </div>
          </div>

          {byDomaine.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">AO par domaine</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byDomaine} margin={{ top: 0, right: 0, left: -10, bottom: 80 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(val, name, props) => [val, props.payload.fullName]} />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Statut breakdown */}
          <div className="card mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition par statut</h2>
            <div className="space-y-2">
              {Object.entries(STATUT_CONFIG).map(([k, v]) => {
                const count = aos.filter(a => a.statut === k).length
                const pct = aos.length ? (count / aos.length) * 100 : 0
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className={clsx('w-32 text-xs', v.color)}>{v.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={clsx('h-2 rounded-full', v.bg.replace('bg-', 'bg-'))} style={{ width: `${pct}%`, backgroundColor: v.color.includes('blue') ? '#2563EB' : undefined }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Concurrents */}
      {tab === 'concurrents' && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Suivi des concurrents</h2>
          <div className="space-y-4">
            {aos.filter(a => a.statut === 'en_attente_de_resultats' || a.statut === 'en_adjudication').map(a => (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.objet || 'Sans objet'}</p>
                    <p className="text-xs text-gray-400">{a.reference}</p>
                  </div>
                  <button
                    className="text-xs text-primary-600 hover:text-primary-800"
                    onClick={() => navigate(`/ao/${a.id}`)}
                  >
                    Voir fiche →
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Aucun concurrent enregistré — voir la fiche AO pour en ajouter</p>
              </div>
            ))}
            {aos.filter(a => a.statut === 'en_attente_de_resultats' || a.statut === 'en_adjudication').length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-8">
                Aucun AO en attente de résultats ou en adjudication
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
