import { exportPDF, exportXLSX } from '../../utils/exports'
import DebitageTab from './Debitage'
import MiseEnBarreTab from './MiseEnBarre'
import VitrageTab from './Vitrage'
import AccessoiresTab from './Accessoires'

export default function RecapTab({ results, lot }) {
  return (
    <div>
      <div className="export-bar">
        <button className="btn-export" onClick={() => exportPDF(results, lot)}>
          📄 Exporter PDF
        </button>
        <button className="btn-export" onClick={() => exportXLSX(results, lot)}>
          📊 Exporter Excel
        </button>
      </div>

      <div className="recap-section">
        <h2>Châssis du chantier</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Config</th>
              <th>Type</th>
              <th className="col-right">L (mm)</th>
              <th className="col-right">H (mm)</th>
              <th className="col-right">Qté</th>
              <th>Coloris</th>
            </tr>
          </thead>
          <tbody>
            {lot.map((c, i) => (
              <tr key={i}>
                <td className="col-mono">{i + 1}</td>
                <td>{c.config}</td>
                <td>{c.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre'}</td>
                <td className="col-right col-mono">{c.L}</td>
                <td className="col-right col-mono">{c.H}</td>
                <td className="col-right col-mono">{c.Q}</td>
                <td>{c.color || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="recap-section">
        <h2>Débitage</h2>
        <DebitageTab debits={results.debits} />
      </div>

      <div className="recap-section">
        <h2>Mise en barre</h2>
        <MiseEnBarreTab optim={results.optim} stats={results.stats} />
      </div>

      <div className="recap-section">
        <h2>Vitrage</h2>
        <VitrageTab vitrage={results.vitrage} />
      </div>

      <div className="recap-section">
        <h2>Accessoires</h2>
        <AccessoiresTab accessoires={results.accessoires} />
      </div>
    </div>
  )
}
