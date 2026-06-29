import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aoApi } from '../lib/api'
import type { AppelOffre } from '../types'
import { STATUT_CONFIG } from '../types'
import { AlertTriangle, TrendingUp, FileText, Clock } from 'lucide-react'
import { fmtNum } from '../lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import clsx from 'clsx'

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA', '#16A34A', '#EA580C', '#DB2777']

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: aos = [] } = useQuery<AppelOffre[]>({
    queryKey: ['aos'],
    queryFn: () => aoApi.list(),
  })

  const { data: pipelineStats } = useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: aoApi.pipelineStats,
  })

  const urgent = aos.filter(a => {
    if (!a.date_limite) return false
    const diff = new Date(a.date_limite).getTime() - Date.now()
    return diff > 0 && diff < 3 * 24 * 3600 * 1000
  })

  const byStatut = Object.entries(STATUT_CONFIG).map(([k, v]) => ({
    name: v.label,
    count: aos.filter(a => a.statut === k).length,
    fill: COLORS[Object.keys(STATUT_CONFIG).indexOf(k) % COLORS.length],
  })).filter(s => s.count > 0)

  const totalEstimation = aos
    .filter(a => a.estimation && ['en_cours_de_reponse', 'en_attente_de_resultats', 'en_adjudication'].includes(a.statut))
    .reduce((sum, a) => sum + (a.estimation || 0), 0)

  const recents = [...aos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  // suppress unused var warning
  void pipelineStats

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4 sm:mb-6">Tableau de bord</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Total AO</p>
            <FileText size={18} className="text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{aos.length}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">En cours</p>
            <Clock size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{aos.filter(a => a.statut === 'en_cours_de_reponse').length}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Marchés actifs</p>
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{aos.filter(a => a.statut === 'marche_en_cours').length}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Pipeline</p>
            <TrendingUp size={18} className="text-orange-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{fmtNum(totalEstimation / 1_000_000, 1)}M DH</p>
        </div>
      </div>

      {/* Alertes urgentes */}
      {urgent.length > 0 && (
        <div className="warning-banner mb-4 sm:mb-6">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Délais urgents (moins de 3 jours)</p>
            <div className="mt-2 space-y-1">
              {urgent.map(a => (
                <button
                  key={a.id}
                  className="flex items-center gap-2 text-sm hover:text-warning-900 w-full text-left"
                  onClick={() => navigate(`/ao/${a.id}`)}
                >
                  <span className="font-medium truncate">{a.reference || a.objet}</span>
                  <span className="text-warning-600 flex-shrink-0">
                    — {new Date(a.date_limite!).toLocaleDateString('fr-MA')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Répartition par statut (bar) */}
        <div className="card overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition par statut</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatut} margin={{ top: 0, right: 0, left: -10, bottom: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byStatut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline par volume</h2>
          {byStatut.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatut} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}>
                  {byStatut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Récents */}
      <div className="card overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Derniers AO enregistrés</h2>
        {recents.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun AO enregistré</p>
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Référence</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Objet</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Statut</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Date limite</th>
              </tr>
            </thead>
            <tbody>
              {recents.map(a => {
                const cfg = STATUT_CONFIG[a.statut]
                return (
                  <tr
                    key={a.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/ao/${a.id}`)}
                  >
                    <td className="py-2 font-mono text-xs text-gray-500">{a.reference || '—'}</td>
                    <td className="py-2 text-gray-800 max-w-[160px] truncate">{a.objet || '—'}</td>
                    <td className="py-2">
                      <span className={clsx('badge', cfg.bg, cfg.color)}>{cfg.label}</span>
                    </td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {a.date_limite ? new Date(a.date_limite).toLocaleDateString('fr-MA') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
