import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function History({ onOpen }) {
  const [chantiers, setChantiers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load(search) {
    setLoading(true)
    setError(null)
    try {
      const { chantiers } = await api.listChantiers({ q: search })
      setChantiers(chantiers)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [])

  function submitSearch(e) {
    e.preventDefault()
    load(q)
  }

  async function remove(id) {
    if (!window.confirm('Supprimer ce chantier ?')) return
    try {
      await api.deleteChantier(id)
      setChantiers(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR')

  return (
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
  )
}
