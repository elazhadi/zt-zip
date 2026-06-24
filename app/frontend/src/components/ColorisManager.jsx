import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function ColorisManager() {
  const [coloris, setColoris] = useState([])
  const [newCode, setNewCode] = useState('')
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await api.listColoris()
      setColoris(r.coloris)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newCode.trim()) return
    setAdding(true)
    setError(null)
    try {
      await api.addColoris(newCode.trim())
      setNewCode('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    setError(null)
    try {
      await api.deleteColoris(id)
      setColoris(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="card coloris-manager">
      <div className="card-title">Référentiel coloris</div>

      {error && <div className="error-msg">{error}</div>}

      <ul className="coloris-list">
        {coloris.map(c => (
          <li key={c.id} className="coloris-item">
            <span className="coloris-code">{c.code}</span>
            <button className="btn-xs btn-danger" onClick={() => handleDelete(c.id)}>
              Supprimer
            </button>
          </li>
        ))}
        {coloris.length === 0 && (
          <li className="coloris-empty">Aucun coloris défini</li>
        )}
      </ul>

      <form className="coloris-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          placeholder="ex. RAL 7016"
          maxLength={30}
        />
        <button type="submit" className="btn-add" disabled={adding || !newCode.trim()}>
          + Ajouter
        </button>
      </form>
    </div>
  )
}
