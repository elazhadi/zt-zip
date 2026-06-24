import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function TarifsManager() {
  const [tarifs,    setTarifs]    = useState([])
  const [selected,  setSelected]  = useState(null)
  const [lignes,    setLignes]    = useState([])
  const [newNom,    setNewNom]    = useState('')
  const [error,     setError]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState(null)

  useEffect(() => { loadTarifs() }, [])

  async function loadTarifs() {
    try { setTarifs((await api.listTarifs()).tarifs) }
    catch (e) { setError(e.message) }
  }

  async function selectTarif(id) {
    setSelected(id); setLignes([]); setError(null)
    try {
      const r = await api.getTarifLignes(id)
      setLignes(r.lignes.map(l => ({ ...l, prix_unitaire: String(l.prix_unitaire) })))
    } catch (e) { setError(e.message) }
  }

  async function createTarif(e) {
    e.preventDefault()
    if (!newNom.trim()) return
    setError(null)
    try {
      const r = await api.createTarif(newNom.trim())
      setNewNom('')
      await loadTarifs()
      selectTarif(r.tarif.id)
    } catch (e) { setError(e.message) }
  }

  async function deleteTarif(id) {
    if (!confirm('Supprimer ce tarif et toutes ses lignes ?')) return
    setError(null)
    try {
      await api.deleteTarif(id)
      if (selected === id) { setSelected(null); setLignes([]) }
      await loadTarifs()
    } catch (e) { setError(e.message) }
  }

  function addLigne() {
    setLignes(prev => [...prev, { _key: Date.now(), ref: '', designation: '', prix_unitaire: '', unite_prix: 'barre' }])
  }

  function removeLigne(idx) {
    setLignes(prev => prev.filter((_, i) => i !== idx))
  }

  function updateLigne(idx, field, val) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l))
  }

  async function saveLignes() {
    setSaving(true); setSaveMsg(null); setError(null)
    try {
      const valid = lignes
        .filter(l => l.ref.trim())
        .map(l => ({
          ref:           l.ref.trim(),
          designation:   l.designation || '',
          prix_unitaire: parseFloat(l.prix_unitaire) || 0,
          unite_prix:    l.unite_prix,
        }))
      await api.setTarifLignes(selected, valid)
      const r = await api.getTarifLignes(selected)
      setLignes(r.lignes.map(l => ({ ...l, prix_unitaire: String(l.prix_unitaire) })))
      setSaveMsg('Enregistré')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const selectedTarif = tarifs.find(t => t.id === selected)

  return (
    <div className="tarifs-manager">
      {/* Colonne gauche — liste des tarifs */}
      <div className="tarifs-sidebar">
        <div className="card">
          <div className="card-title">Listes de prix</div>
          {error && <div className="error-msg">{error}</div>}
          <ul className="tarifs-list">
            {tarifs.map(t => (
              <li key={t.id} className={`tarifs-item${selected === t.id ? ' active' : ''}`}>
                <span className="tarifs-nom" onClick={() => selectTarif(t.id)}>{t.nom}</span>
                <button className="btn-xs btn-danger" onClick={() => deleteTarif(t.id)}>✕</button>
              </li>
            ))}
            {tarifs.length === 0 && <li className="tarifs-empty">Aucun tarif</li>}
          </ul>
          <form className="tarifs-add-form" onSubmit={createTarif}>
            <input
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              placeholder="Nom du tarif"
            />
            <button type="submit" className="btn-add" disabled={!newNom.trim()}>+</button>
          </form>
        </div>
      </div>

      {/* Colonne droite — éditeur de lignes */}
      <div className="tarifs-editor">
        {!selected
          ? <div className="tarifs-placeholder">← Sélectionnez ou créez un tarif</div>
          : (
            <div className="card">
              <div className="card-title">{selectedTarif?.nom}</div>
              <table className="data-table tarifs-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Désignation</th>
                    <th className="col-right">Prix (MAD)</th>
                    <th>Unité</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, idx) => (
                    <tr key={l.id || l._key || idx}>
                      <td>
                        <input
                          className="tarif-cell-input"
                          value={l.ref}
                          onChange={e => updateLigne(idx, 'ref', e.target.value.toUpperCase())}
                          placeholder="6099BIS"
                        />
                      </td>
                      <td>
                        <input
                          className="tarif-cell-input"
                          value={l.designation}
                          onChange={e => updateLigne(idx, 'designation', e.target.value)}
                          placeholder="Rail bombé"
                        />
                      </td>
                      <td>
                        <input
                          className="tarif-cell-input tarif-prix"
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.prix_unitaire}
                          onChange={e => updateLigne(idx, 'prix_unitaire', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <select
                          className="tarif-cell-select"
                          value={l.unite_prix}
                          onChange={e => updateLigne(idx, 'unite_prix', e.target.value)}
                        >
                          <option value="barre">MAD/Barre</option>
                          <option value="ml">MAD/ML</option>
                          <option value="unité">MAD/Unité</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn-xs btn-danger" onClick={() => removeLigne(idx)}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {lignes.length === 0 && (
                    <tr><td colSpan={5} className="tarif-empty-row">Aucune ligne — cliquez "+ Ligne" pour commencer</td></tr>
                  )}
                </tbody>
              </table>
              <div className="tarifs-actions">
                <button className="btn-add" onClick={addLigne}>+ Ligne</button>
                <button className="btn-save" onClick={saveLignes} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {saveMsg && <span className="save-msg">{saveMsg}</span>}
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}
