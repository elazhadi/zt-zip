import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { calcLignesPrix, exportDevisPDF, exportDevisXLSX } from '../utils/devisExport'

const STATUT_LABEL = { nouveau: 'Nouveau', envoyé: 'Envoyé', confirmé: 'Confirmé', annulé: 'Annulé' }
const STATUT_CLASS = { nouveau: 'statut-nouveau', envoyé: 'statut-envoye', confirmé: 'statut-confirme', annulé: 'statut-annule' }

function fmt(n) {
  return n != null ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MAD' : '—'
}

export default function DevisList() {
  const [devis,   setDevis]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setDevis((await api.listDevis()).devis) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function changeStatut(id, statut) {
    try {
      await api.updateDevis(id, { statut })
      setDevis(prev => prev.map(d => d.id === id ? { ...d, statut } : d))
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id, numero) {
    if (!confirm(`Supprimer le devis ${numero || id} ?`)) return
    try {
      await api.deleteDevis(id)
      setDevis(prev => prev.filter(d => d.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleExport(id, format) {
    try {
      const r = await api.getDevis(id)
      const d = r.devis
      const lignesR = d.tarif_id ? await api.getTarifLignes(d.tarif_id) : { lignes: [] }
      const lignesMap = {}
      lignesR.lignes.forEach(l => { lignesMap[l.ref] = l })
      const prix = calcLignesPrix(d.results, lignesMap)
      const common = {
        numero:          d.numero,
        client_nom:      d.client_nom,
        client_ville:    d.client_ville,
        client_contact:  d.client_contact,
        client_tel:      d.client_tel,
        client_adresse:  d.client_adresse,
        intermediaire:   d.intermediaire,
        reference_client:d.reference_client,
        tarif_nom:       d.tarif_nom,
        results:         d.results,
        lot:             d.chassis,
        prix,
        user_nom:        d.user_nom,
      }
      if (format === 'pdf') exportDevisPDF(common)
      else                  exportDevisXLSX(common)
    } catch (e) { setError(e.message) }
  }

  if (loading) return <div className="card"><p style={{ padding: 16 }}>Chargement…</p></div>

  return (
    <div className="card devis-list-card">
      <div className="card-title">Devis</div>
      {error && <div className="error-msg">{error}</div>}

      {devis.length === 0
        ? <p style={{ padding: '16px 0', color: 'var(--gray-400)' }}>Aucun devis enregistré</p>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Ref. chantier</th>
                <th>Tarif</th>
                <th className="col-right">Total HT</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Établi par</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devis.map(d => (
                <tr key={d.id}>
                  <td className="col-mono">{d.numero || `#${d.id}`}</td>
                  <td>{d.client_nom || '—'}</td>
                  <td>{d.reference_client || '—'}</td>
                  <td>{d.tarif_nom || '—'}</td>
                  <td className="col-right col-mono">{fmt(d.montant_ht)}</td>
                  <td>
                    <select
                      className={`statut-select ${STATUT_CLASS[d.statut] || ''}`}
                      value={d.statut}
                      onChange={e => changeStatut(d.id, e.target.value)}
                    >
                      {Object.entries(STATUT_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(d.date_creation).toLocaleDateString('fr-FR')}</td>
                  <td>{d.user_nom || '—'}</td>
                  <td className="devis-row-actions">
                    <button className="btn-xs" onClick={() => handleExport(d.id, 'pdf')} title="PDF">📄</button>
                    <button className="btn-xs" onClick={() => handleExport(d.id, 'xlsx')} title="Excel">📊</button>
                    <button className="btn-xs btn-danger" onClick={() => handleDelete(d.id, d.numero)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  )
}
