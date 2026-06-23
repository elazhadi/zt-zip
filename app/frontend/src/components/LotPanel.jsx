export default function LotPanel({ lot, onRemove, onCalculate }) {
  return (
    <div className="card lot-panel">
      <div className="card-title">
        Chantier&ensp;
        <span className="badge">{lot.length} châssis</span>
      </div>

      {lot.length === 0 ? (
        <p className="empty-hint">Aucun châssis ajouté.</p>
      ) : (
        <table className="lot-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Config</th>
              <th>Type</th>
              <th>L</th>
              <th>H</th>
              <th>Q</th>
              <th>Coloris</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lot.map((c, i) => (
              <tr key={c._id}>
                <td>{i + 1}</td>
                <td>{c.config}</td>
                <td>{c.type === 'porte' ? 'PF' : 'FE'}</td>
                <td>{c.L}</td>
                <td>{c.H}</td>
                <td>{c.Q}</td>
                <td style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.color || '—'}</td>
                <td>
                  <button className="btn-remove" onClick={() => onRemove(c._id)} title="Supprimer">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="btn-calculate" onClick={onCalculate} disabled={lot.length === 0}>
        ⚡ Calculer le débitage
      </button>
    </div>
  )
}
