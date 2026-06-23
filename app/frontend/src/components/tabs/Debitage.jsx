export default function DebitageTab({ debits }) {
  return (
    <div>
      {debits.map((d, i) => (
        <div key={i} className="chassis-block">
          <div className="chassis-block-title">
            Châssis #{i + 1} — {d.chassis.config}&ensp;
            {d.chassis.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre'}&ensp;
            {d.chassis.L} × {d.chassis.H} mm × {d.chassis.Q}
            {d.chassis.color ? ` · ${d.chassis.color}` : ''}
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Désignation</th>
                <th>Coupe</th>
                <th>Formule</th>
                <th className="col-right">Long. (mm)</th>
                <th className="col-right">Qté</th>
              </tr>
            </thead>
            <tbody>
              {d.lignes.map((l, j) => (
                <tr key={j}>
                  <td className="col-ref">{l.ref}</td>
                  <td>{l.des}</td>
                  <td>
                    <span className={`coupe-badge ${l.coupe === 'Onglet 45°' ? 'coupe-onglet' : 'coupe-droite'}`}>
                      {l.coupe}
                    </span>
                  </td>
                  <td className="col-formula">{l.formule}</td>
                  <td className="col-right col-mono">{l.long}</td>
                  <td className="col-right col-mono">{l.qte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
