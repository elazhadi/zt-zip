import { useState, useEffect } from 'react'
import { api } from '../api/client'

// ---- Composants graphiques SVG ----

function BarChart({ data, valueKey = 'n', labelKey = 'label', color = '#1e40af', height = 140 }) {
  if (!data.length) return <div className="chart-empty">Pas de données</div>
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const W = 600; const PAD = 28; const barW = Math.min(36, (W / data.length) - 6)
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} className="stat-chart">
      {data.map((d, i) => {
        const bh = ((d[valueKey] / max) * (height - PAD - 10)) || 0
        const x  = (i / data.length) * W + (W / data.length - barW) / 2
        const y  = height - PAD - bh
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={color} rx={2} opacity={0.85} />
            {bh > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#374151">
                {d[valueKey]}
              </text>
            )}
            <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {d[labelKey]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function HBar({ label, value, max, total, color = '#1e40af', sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="hbar-row">
      <div className="hbar-label" title={label}>{label}</div>
      <div className="hbar-track">
        <div className="hbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="hbar-value">{value.toLocaleString('fr-FR')}{sub ? <span className="hbar-sub">{sub}</span> : null}</div>
    </div>
  )
}

function KpiCard({ label, value, sub, color = '#1e40af' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ---- Utilitaires ----
function fmt(n) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) }
function fmtMad(n) { return `${fmt(n)} MAD` }

function fillMonths(parMois) {
  const now = new Date()
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const found = parMois.find(r => r.mois === mois)
    months.push({ mois, label, n: found ? Number(found.n) : 0 })
  }
  return months
}

const STATUT_COLOR = { nouveau: '#3b82f6', envoyé: '#f59e0b', confirmé: '#10b981', annulé: '#ef4444' }
const STATUT_LABEL = { nouveau: 'Nouveau', envoyé: 'Envoyé', confirmé: 'Confirmé', annulé: 'Annulé' }

// ---- Composant principal ----
export default function Stats() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.getStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="card stat-loading">Chargement des statistiques…</div>
  if (error)   return <div className="error-msg">{error}</div>
  if (!data)   return null

  const { chantiers, gammes, devis, topClients, topProfils, topAccessoires } = data
  const moisData   = fillMonths(chantiers.parMois)
  const maxClient  = Math.max(...topClients.map(c => Number(c.montant)), 1)
  const maxProfil  = Math.max(...topProfils.map(p => p.barres), 1)
  const maxAcc     = Math.max(...topAccessoires.map(a => a.qte), 1)
  const maxGamme   = Math.max(...gammes.map(g => g.total), 1)

  return (
    <div className="stats-page">

      {/* KPI */}
      <div className="kpi-row">
        <KpiCard label="Chantiers" value={fmt(chantiers.total)} />
        <KpiCard label="Devis créés" value={fmt(devis.total)} />
        <KpiCard label="CA confirmé" value={fmtMad(devis.ca_confirme)} color="#10b981" />
        <KpiCard
          label="Taux conversion"
          value={`${devis.taux_conversion} %`}
          sub={`${devis.parStatut.find(s => s.statut === 'confirmé')?.n || 0} confirmés`}
          color="#10b981"
        />
        <KpiCard label="CA pipeline" value={fmtMad(devis.montant_total)} color="#f59e0b" />
      </div>

      {/* Chantiers par mois */}
      <div className="stat-card-wide">
        <div className="stat-section-title">Chantiers — 12 derniers mois</div>
        <BarChart data={moisData} valueKey="n" labelKey="label" color="#1e40af" height={150} />
      </div>

      <div className="stats-row-2">

        {/* Devis par statut */}
        <div className="stat-card-half">
          <div className="stat-section-title">Devis par statut</div>
          {devis.parStatut.length === 0
            ? <div className="chart-empty">Aucun devis</div>
            : devis.parStatut.map(s => (
              <HBar
                key={s.statut}
                label={STATUT_LABEL[s.statut] || s.statut}
                value={s.n}
                max={devis.total || 1}
                color={STATUT_COLOR[s.statut] || '#94a3b8'}
                sub={` · ${fmtMad(s.montant)}`}
              />
            ))
          }
        </div>

        {/* Gammes */}
        <div className="stat-card-half">
          <div className="stat-section-title">Gammes utilisées (châssis)</div>
          {gammes.length === 0
            ? <div className="chart-empty">Aucun châssis</div>
            : gammes.map(g => (
              <HBar
                key={g.gamme}
                label={g.gamme}
                value={g.total}
                max={maxGamme}
                color="#8b5cf6"
                sub=" unités"
              />
            ))
          }
        </div>

      </div>

      <div className="stats-row-2">

        {/* Top clients */}
        <div className="stat-card-half">
          <div className="stat-section-title">Top clients (CA devis)</div>
          {topClients.length === 0
            ? <div className="chart-empty">Aucun client renseigné</div>
            : topClients.map(c => (
              <HBar
                key={c.nom}
                label={c.nom}
                value={c.n}
                max={Math.max(...topClients.map(x => x.n), 1)}
                color="#0891b2"
                sub={` · ${fmtMad(c.montant)}`}
              />
            ))
          }
        </div>

        {/* Top profils */}
        <div className="stat-card-half">
          <div className="stat-section-title">Top profilés (barres consommées)</div>
          {topProfils.length === 0
            ? <div className="chart-empty">Aucun devis avec résultats</div>
            : topProfils.map(p => (
              <HBar
                key={p.ref}
                label={p.ref}
                value={p.barres}
                max={maxProfil}
                color="#1e40af"
                sub={` · ${p.metrage} m`}
              />
            ))
          }
        </div>

      </div>

      {/* Top accessoires */}
      {topAccessoires.length > 0 && (
        <div className="stat-card-wide">
          <div className="stat-section-title">Top accessoires (quantités totales)</div>
          <div className="stats-row-2">
            {topAccessoires.map(a => (
              <HBar
                key={a.ref}
                label={`${a.ref} — ${a.des}`}
                value={a.qte}
                max={maxAcc}
                color="#10b981"
                sub=" unités"
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
