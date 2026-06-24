import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function SiteManager() {
  const [sites, setSites] = useState([])
  const [error, setError] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editNom, setEditNom] = useState('')
  const [editAdresse, setEditAdresse] = useState('')
  const [newNom, setNewNom] = useState('')
  const [newAdresse, setNewAdresse] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await api.listSites()
      setSites(r.sites)
    } catch (e) { setError(e.message) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newNom.trim()) return
    setAdding(true); setError(null)
    try {
      await api.createSite({ nom: newNom.trim(), adresse: newAdresse.trim() || null })
      setNewNom(''); setNewAdresse('')
      await load()
    } catch (e) { setError(e.message) }
    finally { setAdding(false) }
  }

  async function handleUpdate(id) {
    setError(null)
    try {
      await api.updateSite(id, { nom: editNom.trim(), adresse: editAdresse.trim() || null })
      setEditId(null)
      await load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="card site-manager">
      <div className="card-title">Référentiel des sites</div>
      {error && <div className="error-msg">{error}</div>}

      <ul className="site-list">
        {sites.map(s => (
          <li key={s.id} className={`site-item${s.actif ? '' : ' site-inactive'}`}>
            {editId === s.id ? (
              <>
                <div className="site-edit-fields">
                  <input
                    className="site-input"
                    value={editNom}
                    onChange={e => setEditNom(e.target.value)}
                    placeholder="Nom du site"
                    autoFocus
                  />
                  <input
                    className="site-input site-input-addr"
                    value={editAdresse}
                    onChange={e => setEditAdresse(e.target.value)}
                    placeholder="Adresse (optionnel)"
                  />
                </div>
                <div className="site-actions">
                  <button className="btn-xs" onClick={() => handleUpdate(s.id)}>✓</button>
                  <button className="btn-xs" onClick={() => setEditId(null)}>✕</button>
                </div>
              </>
            ) : (
              <>
                <div className="site-info">
                  <span className="site-nom">{s.nom}</span>
                  {s.adresse && s.adresse !== '—' && (
                    <span className="site-adresse">{s.adresse}</span>
                  )}
                </div>
                <div className="site-actions">
                  <span className={`status-${s.actif ? 'active' : 'inactive'}`}>
                    {s.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    className="btn-xs"
                    onClick={() => {
                      setEditId(s.id)
                      setEditNom(s.nom)
                      setEditAdresse(s.adresse && s.adresse !== '—' ? s.adresse : '')
                    }}
                  >
                    Modifier
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {sites.length === 0 && <li className="site-empty">Aucun site défini</li>}
      </ul>

      <form className="site-add-form" onSubmit={handleAdd}>
        <input
          type="text" value={newNom}
          onChange={e => setNewNom(e.target.value)}
          placeholder="Nom du site  (ex. Agence Paris)"
          maxLength={80}
        />
        <input
          type="text" value={newAdresse}
          onChange={e => setNewAdresse(e.target.value)}
          placeholder="Adresse (optionnel)"
          maxLength={160}
        />
        <button type="submit" className="btn-add" disabled={adding || !newNom.trim()}>
          + Ajouter
        </button>
      </form>
    </div>
  )
}
