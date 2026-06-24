import { exportPDF, exportPDFSimple, exportXLSX } from '../../utils/exports'
import { typeLabel } from '../../utils/typeLabel'
import MiseEnBarreTab from './MiseEnBarre'
import VitrageTab from './Vitrage'
import AccessoiresTab from './Accessoires'

function RecapDebitage({ results }) {
  // Agrège toutes les lignes de débitage par ref — une ligne par référence.
  const map = {};
  results.debits.forEach(d =>
    d.lignes.forEach(l => {
      if (!map[l.ref]) map[l.ref] = { ref: l.ref, des: l.des, coupe: l.coupe };
    })
  );

  const refSort = results.refSort || {};
  const rows = Object.values(map).sort((a, b) => {
    const ra = refSort[a.ref] ?? 999, rb = refSort[b.ref] ?? 999;
    return ra - rb;
  });

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Référence</th>
          <th>Désignation</th>
          <th>Coupe</th>
          <th className="col-right">Barres à commander</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const barres = results.optim?.[r.ref]?.bars?.length ?? '—';
          return (
            <tr key={i}>
              <td className="col-ref">{r.ref}</td>
              <td>{r.des}</td>
              <td>
                <span className={`coupe-badge ${r.coupe === 'Onglet 45°' ? 'coupe-onglet' : 'coupe-droite'}`}>
                  {r.coupe}
                </span>
              </td>
              <td className="col-right col-mono">{barres}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function RecapTab({ results, lot, refClient = '' }) {
  return (
    <div>
      <div className="export-bar">
        <button className="btn-export" onClick={() => exportPDFSimple(results, lot, refClient)}
          title="Récap débitage + accessoires uniquement">
          📄 PDF commande
        </button>
        <button className="btn-export" onClick={() => exportPDF(results, lot)}
          title="Toutes les sections : châssis, débitage, mise en barre, vitrage, accessoires">
          📄 PDF complet
        </button>
        <button className="btn-export" onClick={() => exportXLSX(results, lot)}>
          📊 Exporter Excel
        </button>
      </div>

      <div className="recap-section">
        <h2>Récap débitage — chantier complet</h2>
        <RecapDebitage results={results} />
      </div>

      <div className="recap-section">
        <h2>Châssis du chantier</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Gamme</th>
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
                <td>{c.gamme || 'ulysse70'}</td>
                <td>{c.config}</td>
                <td>{typeLabel(c.type)}</td>
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
