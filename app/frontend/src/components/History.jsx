import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { exportChantiers, exportProjet } from '../utils/exportData'

const GAMMES = ['ulysse70', 'pl690', 'prodige_purligne', 'prodige_semibombe', 'prodige_bombe', 'emeraude_coulissant']

export default function History({ onOpen }) {
  const [chantiers, setChantiers] = useState([])
  const [q,         setQ]         = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // Export panel
  const [exporting,  setExporting]  = useState(false)
  const [exportMode, setExportMode] = useState('global')   // global | gamme | projet
  const [exportGamme, setExportGamme] = useState('')
  const [exportProjetId, setExportProjetId] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo,   setExportTo]   = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErr,  setExportErr]  = useState(null)

  async function load(search) {
    setLoading(true); setError(null)
    try {
      setChantiers((await api.listChantiers({ q: search })).chantiers)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load('') }, [])

  function submitSearch(e) { e.preventDefault(); load(q) }

  async function remove(id) {
    if (!window.confirm('Supprimer ce chantier ?')) return
    try {
      await api.deleteChantier(id)
      setChantiers(prev => prev.filter(c => c.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleExport() {
    setExportBusy(true); setExportErr(null)
    try {
      if (exportMode === 'projet') {
        if (!exportProjetId) { setExportErr('Sélectionnez un projet'); return }
        const r = await api.getChantier(exportProjetId)
        exportProjet(r.chantier, r.chassis, r.resultats)
      } else {
        const params = {}
        if (exportMode === 'gamme' && exportGamme) params.gamme = exportGamme
        if (exportFrom) params.from = exportFrom
        if (exportTo)   params.to   = exportTo
        const r = await api.exportChantiers(params)
        exportChantiers(r.chantiers, { gamme: params.gamme, from: exportFrom, to: exportTo })
      }
    } catch (e) { setExportErr(e.message) }
    finally { setExportBusy(false) }
  }

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR')

  return (
    <div>
      {/* ---- Panneau export ---- */}
      <div className="card export-panel">
        <div
          className="export-panel-title"
          onClick={() => setExporting(v => !v)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <span>📊 Exporter les données Excel</span>
          <span className="export-panel-chevron">{exporting ? '▲' : '▼'}</span>
        </div>

        {exporting && (
          <div className="export-panel-body">
            <div className="export-mode-row">
              {[
                { value: 'global',  label: 'Global' },
                { value: 'gamme',   label: 'Par gamme' },
                { value: 'projet',  label: 'Par projet' },
              ].map(m => (
                <label key={m.value} className="export-mode-option">
                  <input
                    type="radio"
                    name="exportMode"
                    value={m.value}
                    checked={exportMode === m.value}
                    onChange={() => setExportMode(m.value)}
                  />
                  {m.label}
                </label>
              ))}
            </div>

            <div className="export-filters">
              {exportMode === 'gamme' && (
                <label>
                  Gamme
                  <select value={exportGamme} onChange={e => setExportGamme(e.target.value)}>
                    <option value="">— Toutes —</option>
                    {GAMMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
              )}

              {exportMode === 'projet' && (
                <label>
                  Projet
                  <select value={exportProjetId} onChange={e => setExportProjetId(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {chantiers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.reference_client || `#${c.id}`} — {fmtDate(c.date_creation)} ({c.nb_chassis} châssis)
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {exportMode !== 'projet' && (
                <>
                  <label>
                    Du
                    <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
                  </label>
                  <label>
                    Au
                    <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} />
                  </label>
                </>
              )}
            </div>

            <div className="export-actions">
              <button className="btn-save" onClick={handleExport} disabled={exportBusy}>
                {exportBusy ? 'Export en cours…' : '📥 Télécharger Excel'}
              </button>
              {exportErr && <span className="error-msg">{exportErr}</span>}
            </div>

            {exportMode === 'projet' && (
              <p className="export-hint">
                L'export projet inclut : châssis, débitage complet, mise en barre, récap barres à commander, accessoires.
              </p>
            )}
            {exportMode === 'global' && (
              <p className="export-hint">
                L'export global inclut 2 feuilles : liste des chantiers + détail de tous les châssis.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ---- Liste des chantiers ---- */}
      <div className="card history-card">
        <div className="card-title">Historique des chantiers</div>

        <form className="history-search" onSubmit={submitSearch}>
          <input
            type="text" value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher par référence client…"
          />
          <button type="submit" className="btn-add" style={{ width: 'auto', padding: '8px 16px' }}>
            Rechercher
          </button>
        </form>

        {error && <div className="error-msg">{error}</div>}
        {loading ? (
          <p className="empty-hint">Chargement…</p>
        ) : chantiers.length === 0 ? (
          <p className="empty-hint">Aucun chantier.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Vendeur</th>
                <th>Site</th>
                <th>Statut</th>
                <th className="col-right">Châssis</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {chantiers.map(c => (
                <tr key={c.id}>
                  <td>{c.reference_client || <em>—</em>}</td>
                  <td className="col-mono">{fmtDate(c.date_creation)}</td>
                  <td>{c.vendeur_nom}</td>
                  <td>{c.site_nom}</td>
                  <td>{c.statut}</td>
                  <td className="col-right col-mono">{c.nb_chassis}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-link" onClick={() => onOpen(c.id)}>Ouvrir</button>
                    <button className="btn-remove" onClick={() => remove(c.id)} title="Supprimer">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
