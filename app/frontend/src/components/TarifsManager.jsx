import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../api/client'

const UNITE_OPTIONS = ['barre', 'ml', 'unité']

// ---- Export helpers ----

function buildExportRows(refs, lignesMap) {
  return [
    ['Référence', 'Désignation', 'Prix (MAD)', 'Unité (barre / ml / unité)'],
    ...refs.map(({ ref, des }) => {
      const existing = lignesMap[ref] || {}
      return [ref, des || existing.designation || '', parseFloat(existing.prix_unitaire) || 0, existing.unite_prix || 'barre']
    }),
  ]
}

function writeXLSX(rows, filename) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 14 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tarif')
  XLSX.writeFile(wb, filename)
}

function exportTarifXLSX(nom, lignes) {
  const rows = [
    ['Référence', 'Désignation', 'Prix (MAD)', 'Unité (barre / ml / unité)'],
    ...lignes.map(l => [l.ref, l.designation, parseFloat(l.prix_unitaire) || 0, l.unite_prix]),
  ]
  writeXLSX(rows, `tarif-${nom.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)
}

// ---- Parse import ----
function parseTarifXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const lignes = rows.slice(1)
          .filter(r => String(r[0] || '').trim())
          .map(r => ({
            ref:           String(r[0] || '').trim().toUpperCase(),
            designation:   String(r[1] || '').trim(),
            prix_unitaire: String(parseFloat(r[2]) || 0),
            unite_prix:    UNITE_OPTIONS.includes(String(r[3] || '').trim())
                             ? String(r[3]).trim()
                             : 'barre',
          }))
        resolve(lignes)
      } catch (err) {
        reject(new Error('Fichier Excel invalide : ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsArrayBuffer(file)
  })
}

export default function TarifsManager() {
  const [tarifs,     setTarifs]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [lignes,     setLignes]     = useState([])
  const [newNom,     setNewNom]     = useState('')
  const [error,      setError]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState(null)
  const [importInfo, setImportInfo] = useState(null) // { count, lignes }
  const [importMode, setImportMode] = useState('replace') // replace | merge

  // Export scope panel
  const [exportPanel,    setExportPanel]    = useState(false)
  const [exportScope,    setExportScope]    = useState('global')  // global | gamme | projet
  const [exportGamme,    setExportGamme]    = useState('')
  const [exportProjetId, setExportProjetId] = useState('')
  const [catalogue,      setCatalogue]      = useState(null)
  const [chantiers,      setChantiers]      = useState([])
  const [exportBusy,     setExportBusy]     = useState(false)
  const [exportErr,      setExportErr]      = useState(null)

  const fileRef = useRef()

  useEffect(() => { loadTarifs() }, [])

  async function loadTarifs() {
    try { setTarifs((await api.listTarifs()).tarifs) }
    catch (e) { setError(e.message) }
  }

  async function selectTarif(id) {
    setSelected(id); setLignes([]); setError(null); setImportInfo(null)
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

  async function saveLignes(lignesOverride) {
    setSaving(true); setSaveMsg(null); setError(null)
    const toSave = (lignesOverride || lignes)
      .filter(l => l.ref.trim())
      .map(l => ({
        ref:           l.ref.trim(),
        designation:   l.designation || '',
        prix_unitaire: parseFloat(l.prix_unitaire) || 0,
        unite_prix:    l.unite_prix,
      }))
    try {
      await api.setTarifLignes(selected, toSave)
      const r = await api.getTarifLignes(selected)
      setLignes(r.lignes.map(l => ({ ...l, prix_unitaire: String(l.prix_unitaire) })))
      setImportInfo(null)
      setSaveMsg('Enregistré')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ---- Import Excel ----
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    fileRef.current.value = ''
    setError(null)
    try {
      const parsed = await parseTarifXLSX(file)
      if (!parsed.length) { setError('Aucune ligne valide trouvée dans le fichier'); return }
      setImportInfo({ count: parsed.length, lignes: parsed })
    } catch (err) { setError(err.message) }
  }

  async function confirmImport() {
    setSaving(true); setError(null)
    try {
      const toSave = importInfo.lignes.map(l => ({
        ref: l.ref.trim(), designation: l.designation || '',
        prix_unitaire: parseFloat(l.prix_unitaire) || 0, unite_prix: l.unite_prix,
      }))
      const merge = importMode === 'merge'
      await api.setTarifLignes(selected, toSave, merge)
      const r = await api.getTarifLignes(selected)
      setLignes(r.lignes.map(l => ({ ...l, prix_unitaire: String(l.prix_unitaire) })))
      setImportInfo(null)
      setSaveMsg(merge ? 'Fusionné' : 'Importé')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  function cancelImport() { setImportInfo(null) }

  // ---- Export scoped ----
  async function openExportPanel() {
    setExportPanel(v => !v)
    setExportErr(null)
    if (!catalogue) {
      try { setCatalogue((await api.getCatalogue()).gammes) } catch {}
    }
    if (!chantiers.length) {
      try { setChantiers((await api.listChantiers()).chantiers) } catch {}
    }
  }

  function lignesMap() {
    const map = {}
    lignes.forEach(l => { map[l.ref] = l })
    return map
  }

  async function handleScopedExport() {
    if (!selected) { setExportErr('Sélectionnez un tarif'); return }
    setExportBusy(true); setExportErr(null)
    try {
      const selectedTarif = tarifs.find(t => t.id === selected)
      const map = lignesMap()

      if (exportScope === 'global') {
        exportTarifXLSX(selectedTarif?.nom || 'tarif', lignes)
        return
      }

      if (exportScope === 'gamme') {
        if (!exportGamme) { setExportErr('Sélectionnez une gamme'); return }
        const gammeData = catalogue?.[exportGamme]
        if (!gammeData) { setExportErr('Gamme introuvable dans le catalogue'); return }
        const refs = [
          ...(gammeData.profils || []).map(r => ({ ref: r.ref, des: r.designation || r.des || '' })),
          ...(gammeData.accessoires || []).map(r => ({ ref: r.ref, des: r.designation || r.des || '' })),
        ]
        const rows = buildExportRows(refs, map)
        writeXLSX(rows, `tarif-${(selectedTarif?.nom || 'tarif').replace(/[^a-zA-Z0-9]/g, '_')}-${exportGamme}.xlsx`)
        return
      }

      if (exportScope === 'projet') {
        if (!exportProjetId) { setExportErr('Sélectionnez un projet'); return }
        const { chantier, resultats } = await api.getChantier(exportProjetId)
        if (!resultats) { setExportErr('Aucun débitage pour ce projet'); return }
        const refs = [
          ...Object.keys(resultats.optim || {}).map(ref => ({ ref, des: '' })),
          ...(resultats.accessoires || []).map(a => ({ ref: a.ref, des: a.des || '' })),
        ]
        const rows = buildExportRows(refs, map)
        const slug = (chantier.reference_client || `projet-${exportProjetId}`).replace(/[^a-zA-Z0-9]/g, '_')
        writeXLSX(rows, `tarif-${(selectedTarif?.nom || 'tarif').replace(/[^a-zA-Z0-9]/g, '_')}-${slug}.xlsx`)
      }
    } catch (e) { setExportErr(e.message) }
    finally { setExportBusy(false) }
  }

  const selectedTarif = tarifs.find(t => t.id === selected)
  const gammeKeys = catalogue ? Object.keys(catalogue).sort() : []

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

      {/* Colonne droite — éditeur */}
      <div className="tarifs-editor">
        {!selected
          ? <div className="tarifs-placeholder">← Sélectionnez ou créez un tarif</div>
          : (
            <div className="card">
              <div className="tarifs-editor-header">
                <div className="card-title" style={{ margin: 0 }}>{selectedTarif?.nom}</div>
                <div className="tarifs-io-btns">
                  <button
                    className="btn-export"
                    onClick={openExportPanel}
                    title="Exporter vers Excel"
                  >
                    📥 Exporter Excel {exportPanel ? '▲' : '▼'}
                  </button>
                  <label className="btn-export tarif-import-btn" title="Importer depuis Excel">
                    📤 Importer Excel
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.ods"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Panneau export scoped */}
              {exportPanel && (
                <div className="tarif-export-panel">
                  <div className="export-mode-row">
                    {[
                      { value: 'global', label: 'Global' },
                      { value: 'gamme',  label: 'Par gamme' },
                      { value: 'projet', label: 'Par projet' },
                    ].map(m => (
                      <label key={m.value} className="export-mode-option">
                        <input
                          type="radio"
                          name="exportScope"
                          value={m.value}
                          checked={exportScope === m.value}
                          onChange={() => setExportScope(m.value)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>

                  {exportScope === 'gamme' && (
                    <label className="tarif-export-select-label">
                      Gamme
                      <select value={exportGamme} onChange={e => setExportGamme(e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {gammeKeys.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>
                  )}

                  {exportScope === 'projet' && (
                    <label className="tarif-export-select-label">
                      Projet
                      <select value={exportProjetId} onChange={e => setExportProjetId(e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {chantiers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.reference_client || `#${c.id}`} — {new Date(c.date_creation).toLocaleDateString('fr-FR')}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="export-actions" style={{ marginTop: 8 }}>
                    <button className="btn-save" onClick={handleScopedExport} disabled={exportBusy}>
                      {exportBusy ? 'Export…' : '📥 Télécharger Excel'}
                    </button>
                    {exportErr && <span className="error-msg">{exportErr}</span>}
                  </div>
                  <p className="export-hint" style={{ marginTop: 6 }}>
                    {exportScope === 'global'  && 'Toutes les références du tarif actuel.'}
                    {exportScope === 'gamme'   && 'Références utilisées par la gamme sélectionnée, prix pré-remplis.'}
                    {exportScope === 'projet'  && 'Références du débitage de ce projet, prix pré-remplis.'}
                  </p>
                </div>
              )}

              {/* Bandeau de confirmation d'import */}
              {importInfo && (
                <div className="tarif-import-confirm">
                  <span>
                    <strong>{importInfo.count} lignes</strong> prêtes à importer.
                  </span>
                  <div className="tarif-import-mode">
                    {[
                      { value: 'replace', label: 'Remplacer tout' },
                      { value: 'merge',   label: 'Fusionner (MAJ uniquement)' },
                    ].map(m => (
                      <label key={m.value} className="export-mode-option">
                        <input
                          type="radio"
                          name="importMode"
                          value={m.value}
                          checked={importMode === m.value}
                          onChange={() => setImportMode(m.value)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-save" onClick={confirmImport} disabled={saving}>
                      {saving ? '…' : 'Appliquer'}
                    </button>
                    <button className="btn-xs" onClick={cancelImport}>Annuler</button>
                  </div>
                </div>
              )}

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
                    <tr>
                      <td colSpan={5} className="tarif-empty-row">
                        Aucune ligne — cliquez "+ Ligne" ou importez un fichier Excel
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="tarifs-actions">
                <button className="btn-add" onClick={addLigne}>+ Ligne</button>
                <button className="btn-save" onClick={() => saveLignes()} disabled={saving}>
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
