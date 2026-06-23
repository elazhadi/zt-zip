const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
]

const KERF = 5 // mm, trait de scie

const REF_ORDER = [
  '6099BIS', 'PL600.01', 'PL600.03', 'PL600.04',
  'PL600.10-11', 'PL600.20-21-22', 'PL600.32', 'PL600.30', 'PL600.60',
]

function BarViz({ bar, barre }) {
  const { cuts, rem } = bar
  const segments = []
  cuts.forEach((len, i) => {
    segments.push({ len, type: 'cut', idx: i })
    if (i < cuts.length - 1) segments.push({ len: KERF, type: 'kerf' })
  })
  if (rem > 0) segments.push({ len: rem, type: 'waste' })

  let offsetPct = 0
  return (
    <div className="bar-viz">
      <svg width="100%" height="26" style={{ display: 'block', borderRadius: 3, overflow: 'hidden' }}>
        {segments.map((seg, i) => {
          const x = offsetPct
          const w = (seg.len / barre) * 100
          offsetPct += w

          if (seg.type === 'kerf') {
            return <rect key={i} x={`${x}%`} width={`${w}%`} height="26" fill="#374151" />
          }
          if (seg.type === 'waste') {
            return <rect key={i} x={`${x}%`} width={`${w}%`} height="26" fill="#e5e7eb" />
          }
          const color = PALETTE[seg.idx % PALETTE.length]
          return (
            <g key={i}>
              <rect x={`${x}%`} width={`${w}%`} height="26" fill={color} />
              {w > 6 && (
                <text
                  x={`${x + w / 2}%`} y="17"
                  textAnchor="middle" fill="white"
                  fontSize="10" fontWeight="700"
                >
                  {seg.len}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="bar-waste-label">chute : {rem} mm</div>
    </div>
  )
}

export default function MiseEnBarreTab({ optim, stats }) {
  const refs = Object.keys(optim).sort((a, b) => REF_ORDER.indexOf(a) - REF_ORDER.indexOf(b))

  return (
    <div>
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.barres}</div>
          <div className="stat-label">barres totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.metreTotal_m} m</div>
          <div className="stat-label">métré total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.chuteTotale_m} m</div>
          <div className="stat-label">chute totale</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.chutePct}%</div>
          <div className="stat-label">taux de chute</div>
        </div>
      </div>

      {refs.map(ref => {
        const { bars, barre } = optim[ref]
        return (
          <div key={ref} className="profile-block">
            <div className="profile-block-title">
              <span className="col-ref">{ref}</span>
              <span className="badge">{bars.length} barre{bars.length > 1 ? 's' : ''} × {barre} mm</span>
            </div>
            {bars.map((bar, i) => (
              <div key={i} className="bar-row">
                <span className="bar-num">B{i + 1}</span>
                <div className="bar-viz-wrap">
                  <BarViz bar={bar} barre={barre} />
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
