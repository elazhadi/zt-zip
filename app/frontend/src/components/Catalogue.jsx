import { useState, useEffect } from 'react'
import { api } from '../api/client'

// ---- Icône de coupe (visualise onglet 45° vs droite) --------------------
function CoupeIcon({ coupe }) {
  const onglet = coupe === 'Onglet 45°'
  return (
    <svg viewBox="0 0 44 18" width="44" height="18" className="coupe-icon" title={coupe}>
      {onglet ? (
        <polygon points="6,16 12,2 38,2 38,16" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      ) : (
        <rect x="6" y="2" width="32" height="14" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" rx="2" />
      )}
      {/* ligne centrale représentant le profilé */}
      <line x1={onglet ? 9 : 6} y1="9" x2="38" y2="9"
        stroke={onglet ? '#d97706' : '#16a34a'} strokeWidth="1" strokeDasharray="3,2" />
    </svg>
  )
}

// ---- Schéma SVG d'une configuration coulissante -------------------------
function SchemaCoulissant({ config }) {
  const { vantaux, rails } = config
  if (!vantaux || !rails) return null
  const W = 180, H = 120, brd = 8
  const railH = (H - 2 * brd) / rails
  const vPerRail = Math.ceil(vantaux / rails)
  const panelW = (W - 2 * brd) / vPerRail
  let idx = 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="schema-svg" aria-label={config.id}>
      <rect x={1} y={1} width={W-2} height={H-2} fill="#eff6ff" stroke="#1e40af" strokeWidth={2.5} rx={3} />
      {Array.from({ length: rails }, (_, ri) => {
        const y0 = brd + ri * railH
        return (
          <g key={ri}>
            {ri > 0 && <line x1={brd} y1={y0} x2={W-brd} y2={y0} stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="5,3" />}
            {Array.from({ length: vPerRail }, (_, vi) => {
              const goRight = (idx++ % 2 === 0)
              const x0 = brd + vi * panelW
              return (
                <g key={vi}>
                  <rect x={x0+1} y={y0+2} width={panelW-2} height={railH-4}
                    fill="rgba(255,255,255,.75)" stroke="#60a5fa" strokeWidth={1} rx={1} />
                  <text x={x0+panelW/2} y={y0+railH/2+5} textAnchor="middle"
                    fontSize="13" fill="#1e40af" fontWeight="700">
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

// ---- Badge marque -------------------------------------------------------
function MarqueBadge({ marque }) {
  const initials = marque.split(/[\s/]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="marque-badge" title={marque}>
      <span className="marque-badge-initials">{initials}</span>
    </div>
  )
}

// ---- Table des profilés -------------------------------------------------
function ProfilsTable({ profils, barre }) {
  if (!profils.length) return <p className="catalogue-empty-sub">Profilés non renseignés</p>
  return (
    <table className="catalogue-table">
      <thead>
        <tr>
          <th>Référence</th>
          <th>Désignation</th>
          <th>Coupe</th>
          <th>Formule longueur</th>
          <th className="col-right">Barre (mm)</th>
        </tr>
      </thead>
      <tbody>
        {profils.map(p => (
          <tr key={p.ref}>
            <td className="col-ref">{p.ref}</td>
            <td>{p.des}</td>
            <td>
              <div className="coupe-cell">
                <CoupeIcon coupe={p.coupe} />
                <span className={`coupe-badge ${p.coupe === 'Onglet 45°' ? 'coupe-onglet' : 'coupe-droite'}`}>
                  {p.coupe}
                </span>
              </div>
            </td>
            <td className="col-formula">{p.formule}</td>
            <td className="col-right col-mono">{p.barre ?? barre?.standard ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- Table des accessoires ----------------------------------------------
function AccessoiresTable({ accessoires }) {
  if (!accessoires.length) return (
    <p className="catalogue-empty-sub">Accessoires non renseignés pour cette gamme</p>
  )
  return (
    <table className="catalogue-table">
      <thead>
        <tr>
          <th>Référence</th>
          <th>Désignation</th>
          <th>Unité</th>
        </tr>
      </thead>
      <tbody>
        {accessoires.map(a => (
          <tr key={a.ref}>
            <td className="col-ref">{a.ref}</td>
            <td>{a.des}</td>
            <td className="col-mono">{a.unite}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- Carte gamme --------------------------------------------------------
function GammeCard({ g }) {
  const [tab, setTab] = useState('configs')
  return (
    <div className="catalogue-gamme-card">
      <div className="catalogue-gamme-header">
        <span className="catalogue-gamme-name">{g.gamme || g.label}</span>
        <span className="catalogue-gamme-barre">{g.barre?.standard ?? '?'} mm</span>
      </div>
      {g.barre?.montants && g.barre.montants !== g.barre.standard && (
        <div className="catalogue-gamme-sub">Montants : {g.barre.montants} mm</div>
      )}

      <div className="catalogue-card-tabs">
        <button className={tab === 'configs'    ? 'catalogue-tab active' : 'catalogue-tab'} onClick={() => setTab('configs')}>
          Configurations ({g.configs.length})
        </button>
        <button className={tab === 'profils'    ? 'catalogue-tab active' : 'catalogue-tab'} onClick={() => setTab('profils')}>
          Profilés ({g.profils.length})
        </button>
        <button className={tab === 'accessoires' ? 'catalogue-tab active' : 'catalogue-tab'} onClick={() => setTab('accessoires')}>
          Accessoires {g.accessoires.length > 0 ? `(${g.accessoires.length})` : ''}
        </button>
      </div>

      {tab === 'configs' && (
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
      )}

      {tab === 'profils' && (
        <div className="catalogue-table-wrap">
          <ProfilsTable profils={g.profils} barre={g.barre} />
        </div>
      )}

      {tab === 'accessoires' && (
        <div className="catalogue-table-wrap">
          <AccessoiresTable accessoires={g.accessoires} />
        </div>
      )}
    </div>
  )
}

// ---- Page principale ----------------------------------------------------
export default function Catalogue() {
  const [gammes, setGammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCatalogue()
      .then(r => { setGammes(r.gammes); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const byMarque = {}
  gammes.forEach(g => {
    const m = g.marque || 'Autre'
    if (!byMarque[m]) byMarque[m] = []
    byMarque[m].push(g)
  })

  if (loading) return <div className="catalogue-loading">Chargement du catalogue…</div>
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
              <div className="catalogue-marque-count">{glist.length} gamme{glist.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="catalogue-gammes-grid">
            {glist.map(g => <GammeCard key={g.id} g={g} />)}
          </div>
        </section>
      ))}

      {gammes.length === 0 && <p className="catalogue-empty">Aucune gamme disponible</p>}
    </div>
  )
}
