export default function VitrageTab({ vitrage }) {
  const totalQte  = vitrage.reduce((s, v) => s + v.qte, 0)
  const totalSurf = vitrage.reduce((s, v) => s + v.larg * v.haut / 1e6 * v.qte, 0)

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Repère</th>
          <th>Config</th>
          <th className="col-right">Largeur (mm)</th>
          <th className="col-right">Hauteur (mm)</th>
          <th className="col-right">Qté</th>
          <th className="col-right">Surface (m²)</th>
        </tr>
      </thead>
      <tbody>
        {vitrage.map((v, i) => {
          const surf = (v.larg * v.haut / 1e6 * v.qte).toFixed(2)
          return (
            <tr key={i}>
              <td className="col-mono">#{v.repere}</td>
              <td>{v.config}</td>
              <td className="col-right col-mono">{v.larg}</td>
              <td className="col-right col-mono">{v.haut}</td>
              <td className="col-right col-mono">{v.qte}</td>
              <td className="col-right col-mono">{surf}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="4">Total</td>
          <td className="col-right">{totalQte}</td>
          <td className="col-right">{totalSurf.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
