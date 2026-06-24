import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../api/client'

const UNITE_OPTIONS = ['barre', 'ml', 'unité']

// ---- Excel helpers ----

function writeXLSX(rows, filename) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 20 }, { wch: 36 }, { wch: 14 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tarif')
  XLSX.writeFile(wb, filename)
}

function refRows(refs, lignesMap) {
  return refs.map(({ ref, des }) => {
    const ex = lignesMap[ref] || {}
    return [ref, des || ex.designation || '', parseFloat(ex.prix_unitaire) || 0, ex.unite_prix || 'barre']
  })
}

function HEADER() {
  return ['Référence', 'Désignation', 'Prix (MAD)', 'Unité (barre / ml / unité)']
}

// ---- Import ----
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
            unite_prix:    UNITE_OPTIONS.includes(String(r[3] || '').trim()) ? String(r[3]).trim() : 'barre',
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

const EXPORT_SCOPES = [
  { value: 'tout',        label: 'Tout le tarif' },
  { value: 'gamme',       label: 'Une gamme' },
  { value: 'profils',     label: 'Profilés (catalogue)' },
  { value: 'accessoires', label: 'Accessoires (catalogue)' },
  { value: 'chantier',    label: 'Chantier (débitage)' },
  { value: 'vitrage',     label: 'Vitrage (chantier)' },
]

export default function TarifsManager() {
  const [tarifs,     setTarifs]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [lignes,     setLignes]     = useState([])
  const [newNom,     setNewNom]     = useState('')
  const [error,      setError]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState(null)
  const [importInfo, setImportInfo] = useState(null)
  const [importMode, setImportMode] = useState('replace')

  // Export panel
  const [exportOpen,     setExportOpen]     = useState(false)
  const [exportScope,    setExportScope]    = useState('tout')
  const [exportGamme,    setExportGamme]    = useState('')
  const [exportProjetId, setExportProjetId] = useState('')
  const [exportBusy,     setExportBusy]     = useState(false)
  const [exportErr,      setExportErr]      = useState(null)

  // Data for export selectors — loaded when a tarif is selected
  const [catalogue,  setCatalogue]  = useState(null)  // array of gamme objects
  const [chantiers,  setChantiers]  = useState([])

  const fileRef = useRef()

  useEffect(() => { loadTarifs() }, [])

  // Pre-load catalogue + chantiers when a tarif is selected
  useEffect(() => {
    if (!selected) return
    if (!catalogue) {
      api.getCatalogue().then(r => setCatalogue(r.gammes)).catch(() => {})
    }
    if (!chantiers.length) {
      api.listChantiers().then(r => setChantiers(r.chantiers)).catch(() => {})
    }
  }, [selected])

  async function loadTarifs() {
    try { setTarifs((await api.listTarifs()).tarifs) }
    catch (e) { setError(e.message) }
  }

  async function selectTarif(id) {
    setSelected(id); setLignes([]); setError(null); setImportInfo(null); setExportOpen(false)
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

  // ---- Import ----
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
      await api.setTarifLignes(selected, toSave, importMode === 'merge')
      const r = await api.getTarifLignes(selected)
      setLignes(r.lignes.map(l => ({ ...l, prix_unitaire: String(l.prix_unitaire) })))
      setImportInfo(null)
      setSaveMsg(importMode === 'merge' ? 'Fusionné' : 'Importé')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ---- Export ----
  function lignesMap() {
    const map = {}
    lignes.forEach(l => { map[l.ref.toUpperCase()] = l })
    return map
  }

  function dedup(refs) {
    const seen = new Set()
    return refs.filter(r => {
      if (seen.has(r.ref)) return false
      seen.add(r.ref); return true
    })
  }

  async function handleExport() {
    if (!selected) return
    setExportBusy(true); setExportErr(null)
    try {
      const selectedTarif = tarifs.find(t => t.id === selected)
      const tarNom = (selectedTarif?.nom || 'tarif').replace(/[^a-zA-Z0-9]/g, '_')
      const map = lignesMap()

      if (exportScope === 'tout') {
        writeXLSX([HEADER(), ...lignes.map(l => [l.ref, l.designation, parseFloat(l.prix_unitaire) || 0, l.unite_prix])],
          `tarif-${tarNom}.xlsx`)
        return
      }

      if (exportScope === 'profils') {
        if (!catalogue) { setExportErr('Catalogue non chargé, réessayez'); return }
        const refs = dedup(
          catalogue.flatMap(g => (g.profils || []).map(p => ({ ref: p.ref, des: p.designation || p.des || '' })))
        )
        writeXLSX([HEADER(), ...refRows(refs, map)], `tarif-${tarNom}-profils.xlsx`)
        return
      }

      if (exportScope === 'accessoires') {
        if (!catalogue) { setExportErr('Catalogue non chargé, réessayez'); return }
        const refs = dedup(
          catalogue.flatMap(g => (g.accessoires || []).map(a => ({ ref: a.ref, des: a.designation || a.des || '' })))
        )
        writeXLSX([HEADER(), ...refRows(refs, map)], `tarif-${tarNom}-accessoires.xlsx`)
        return
      }

      if (exportScope === 'gamme') {
        if (!exportGamme) { setExportErr('Sélectionnez une gamme'); return }
        if (!catalogue) { setExportErr('Catalogue non chargé, réessayez'); return }
        const g = catalogue.find(x => x.id === exportGamme)
        if (!g) { setExportErr('Gamme introuvable'); return }
        const refs = [
          ...(g.profils    || []).map(p => ({ ref: p.ref, des: p.designation || p.des || '' })),
          ...(g.accessoires|| []).map(a => ({ ref: a.ref, des: a.designation || a.des || '' })),
        ]
        writeXLSX([HEADER(), ...refRows(refs, map)], `tarif-${tarNom}-${exportGamme}.xlsx`)
        return
      }

      if (exportScope === 'chantier') {
        if (!exportProjetId) { setExportErr('Sélectionnez un chantier'); return }
        const { chantier, resultats } = await api.getChantier(exportProjetId)
        if (!resultats) { setExportErr('Aucun débitage pour ce chantier'); return }
        const refs = dedup([
          ...Object.keys(resultats.optim || {}).map(ref => ({ ref, des: '' })),
          ...(resultats.accessoires || []).map(a => ({ ref: a.ref, des: a.des || '' })),
        ])
        const slug = (chantier.reference_client || `chantier-${exportProjetId}`).replace(/[^a-zA-Z0-9]/g, '_')
        writeXLSX([HEADER(), ...refRows(refs, map)], `tarif-${tarNom}-${slug}.xlsx`)
        return
      }

      if (exportScope === 'vitrage') {
        if (!exportProjetId) { setExportErr('Sélectionnez un chantier'); return }
        const { resultats } = await api.getChantier(exportProjetId)
        if (!resultats?.vitrage?.length) { setExportErr('Aucun vitrage pour ce chantier'); return }
        // Déduplique par dimension
        const dims = {}
        resultats.vitrage.forEach(v => {
          const key = `${v.larg}x${v.haut}`
          if (!dims[key]) dims[key] = { larg: v.larg, haut: v.haut, qte: 0 }
          dims[key].qte += v.qte
        })
        const refs = Object.entries(dims).map(([key, v]) => ({
          ref: `VIT-${key}`,
          des: `Vitrage ${v.larg}×${v.haut} mm`,
        }))
        writeXLSX([HEADER(), ...refRows(refs, map)], `tarif-${tarNom}-vitrage.xlsx`)
      }
    } catch (e) { setExportErr(e.message) }
    finally { setExportBusy(false) }
  }

  const selectedTarif = tarifs.find(t => t.id === selected)
  const needsProject  = exportScope === 'chantier' || exportScope === 'vitrage'
  const needsGamme    = exportScope === 'gamme'

  return (
    <div className="tarifs-manager">
      {/* Colonne gauche */}
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
            <input value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Nom du tarif" />
            <button type="submit" className="btn-add" disabled={!newNom.trim()}>+</button>
          </form>
        </div>
      </div>

      {/* Colonne droite */}
      <div className="tarifs-editor">
        {!selected
          ? <div className="tarifs-placeholder">← Sélectionnez ou créez un tarif</div>
          : (
            <div className="card">
              <div className="tarifs-editor-header">
                <div className="card-title" style={{ margin: 0 }}>{selectedTarif?.nom}</div>
                <div className="tarifs-io-btns">
                  <button
                    className={`btn-export${exportOpen ? ' active' : ''}`}
                    onClick={() => { setExportOpen(v => !v); setExportErr(null) }}
                  >
                    📥 Exporter Excel {exportOpen ? '▲' : '▼'}
                  </button>
                  <label className="btn-export tarif-import-btn">
                    📤 Importer Excel
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.ods"
                      style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {/* Panneau export */}
              {exportOpen && (
                <div className="tarif-export-panel">
                  <div className="tarif-scope-grid">
                    {EXPORT_SCOPES.map(s => (
                      <label key={s.value} className={`tarif-scope-btn${exportScope === s.value ? ' selected' : ''}`}>
                        <input type="radio" name="exportScope" value={s.value}
                          checked={exportScope === s.value}
                          onChange={() => setExportScope(s.value)} />
                        {s.label}
                      </label>
                    ))}
                  </div>

                  {needsGamme && (
                    <div className="tarif-export-row">
                      <label>Gamme</label>
                      <select value={exportGamme} onChange={e => setExportGamme(e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {(catalogue || []).map(g => (
                          <option key={g.id} value={g.id}>{g.nom || g.id}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {needsProject && (
                    <div className="tarif-export-row">
                      <label>Chantier</label>
                      <select value={exportProjetId} onChange={e => setExportProjetId(e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {chantiers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.reference_client || `#${c.id}`} — {new Date(c.date_creation).toLocaleDateString('fr-FR')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="tarif-export-actions">
                    <button className="btn-save" onClick={handleExport} disabled={exportBusy}>
                      {exportBusy ? 'Export…' : '📥 Télécharger'}
                    </button>
                    <span className="export-hint" style={{ marginLeft: 10 }}>
                      {exportScope === 'tout'        && 'Toutes les lignes du tarif actuel'}
                      {exportScope === 'gamme'       && 'Profilés + accessoires de la gamme, prix pré-remplis'}
                      {exportScope === 'profils'     && 'Tous les profilés du catalogue, prix pré-remplis'}
                      {exportScope === 'accessoires' && 'Tous les accessoires du catalogue, prix pré-remplis'}
                      {exportScope === 'chantier'    && 'Refs du débitage de ce chantier, prix pré-remplis'}
                      {exportScope === 'vitrage'     && 'Dimensions vitrage du chantier (VIT-LxH), à tarifier'}
                    </span>
                    {exportErr && <span className="error-msg" style={{ marginLeft: 8 }}>{exportErr}</span>}
                  </div>
                </div>
              )}

              {/* Bandeau import */}
              {importInfo && (
                <div className="tarif-import-confirm">
                  <span><strong>{importInfo.count} lignes</strong> prêtes à importer.</span>
                  <div className="tarif-import-mode">
                    {[
                      { value: 'replace', label: 'Remplacer tout' },
                      { value: 'merge',   label: 'Fusionner (MAJ uniquement)' },
                    ].map(m => (
                      <label key={m.value} className="export-mode-option">
                        <input type="radio" name="importMode" value={m.value}
                          checked={importMode === m.value}
                          onChange={() => setImportMode(m.value)} />
                        {m.label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-save" onClick={confirmImport} disabled={saving}>
                      {saving ? '…' : 'Appliquer'}
                    </button>
                    <button className="btn-xs" onClick={() => setImportInfo(null)}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Tableau des lignes */}
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
                        <input className="tarif-cell-input" value={l.ref}
                          onChange={e => updateLigne(idx, 'ref', e.target.value.toUpperCase())}
                          placeholder="6099BIS" />
                      </td>
                      <td>
                        <input className="tarif-cell-input" value={l.designation}
                          onChange={e => updateLigne(idx, 'designation', e.target.value)}
                          placeholder="Rail bombé" />
                      </td>
                      <td>
                        <input className="tarif-cell-input tarif-prix" type="number"
                          step="0.01" min="0" value={l.prix_unitaire}
                          onChange={e => updateLigne(idx, 'prix_unitaire', e.target.value)}
                          placeholder="0.00" />
                      </td>
                      <td>
                        <select className="tarif-cell-select" value={l.unite_prix}
                          onChange={e => updateLigne(idx, 'unite_prix', e.target.value)}>
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
