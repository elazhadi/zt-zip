import { useState, useEffect } from 'react'
import { api } from '../api/client'

// SVG schema for a coulissant configuration showing rails and sliding panels
function SchemaCoulissant({ config }) {
  const { vantaux, rails } = config
  if (!vantaux || !rails) return null

  const W = 180, H = 120
  const brd = 8
  const railH = (H - 2 * brd) / rails
  const vPerRail = Math.ceil(vantaux / rails)
  const panelW = (W - 2 * brd) / vPerRail

  let panelIdx = 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="schema-svg" aria-label={config.id}>
      {/* Dormant frame */}
      <rect x={1} y={1} width={W - 2} height={H - 2}
        fill="#eff6ff" stroke="#1e40af" strokeWidth={2.5} rx={3} />

      {Array.from({ length: rails }, (_, ri) => {
        const y0 = brd + ri * railH
        return (
          <g key={ri}>
            {/* Rail separator (dashed) */}
            {ri > 0 && (
              <line x1={brd} y1={y0} x2={W - brd} y2={y0}
                stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="5,3" />
            )}
            {/* Panels in this rail */}
            {Array.from({ length: vPerRail }, (_, vi) => {
              const goRight = (panelIdx++ % 2 === 0)
              const x0 = brd + vi * panelW
              return (
                <g key={vi}>
                  <rect x={x0 + 1} y={y0 + 2} width={panelW - 2} height={railH - 4}
                    fill="rgba(255,255,255,.75)" stroke="#60a5fa" strokeWidth={1} rx={1} />
                  <text
                    x={x0 + panelW / 2} y={y0 + railH / 2 + 5}
                    textAnchor="middle" fontSize="13" fill="#1e40af" fontWeight="700"
                  >
                    {goRight ? '→' : '←'}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// Textual logo badge for a marque (no image files needed)
function MarqueBadge({ marque }) {
  const initials = marque
    .split(/[\s/]+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="marque-badge" title={marque}>
      <span className="marque-badge-initials">{initials}</span>
    </div>
  )
}

export default function Catalogue() {
  const [gammes, setGammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCatalogue()
      .then(r => { setGammes(r.gammes); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // Group by marque
  const byMarque = {}
  gammes.forEach(g => {
    const m = g.marque || 'Autre'
    if (!byMarque[m]) byMarque[m] = []
    byMarque[m].push(g)
  })

  if (loading) return (
    <div className="catalogue-loading">Chargement du catalogue…</div>
  )
  if (error) return <div className="error-msg" style={{ margin: 16 }}>{error}</div>

  return (
    <div className="catalogue">
      <div className="catalogue-header">
        <h1 className="catalogue-title">Catalogue des gammes</h1>
        <p className="catalogue-subtitle">
          {gammes.length} gamme{gammes.length !== 1 ? 's' : ''} disponible{gammes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {Object.entries(byMarque).map(([marque, glist]) => (
        <section key={marque} className="catalogue-marque-section">
          <div className="catalogue-marque-header">
            <MarqueBadge marque={marque} />
            <div>
              <div className="catalogue-marque-name">{marque}</div>
              <div className="catalogue-marque-count">
                {glist.length} gamme{glist.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="catalogue-gammes-grid">
            {glist.map(g => (
              <div key={g.id} className="catalogue-gamme-card">
                <div className="catalogue-gamme-header">
                  <span className="catalogue-gamme-name">{g.gamme || g.label}</span>
                  <span className="catalogue-gamme-barre">
                    {g.barre?.standard ?? '?'} mm
                  </span>
                </div>

                {g.barre?.montants && g.barre.montants !== g.barre.standard && (
                  <div className="catalogue-gamme-sub">
                    Montants : {g.barre.montants} mm
                  </div>
                )}

                <div className="catalogue-configs-grid">
                  {g.configs.map(c => (
                    <div key={c.id} className="catalogue-config-card">
                      <div className="catalogue-config-id">{c.id}</div>
                      <SchemaCoulissant config={c} />
                      <div className="catalogue-config-meta">
                        {c.vantaux}V · {c.rails}R{c.hasJonction ? ' · jonction' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {g.refs.length > 0 && (
                  <details className="catalogue-refs">
                    <summary>Références profilés ({g.refs.length})</summary>
                    <div className="catalogue-refs-list">
                      {g.refs.map(r => (
                        <span key={r} className="catalogue-ref-chip">{r}</span>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {gammes.length === 0 && (
        <p className="catalogue-empty">Aucune gamme disponible</p>
      )}
    </div>
  )
}
