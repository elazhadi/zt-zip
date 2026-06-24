import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useAuth } from '../api/auth.jsx'
import { calcLignesPrix, exportDevisPDF, exportDevisXLSX } from '../utils/devisExport'

function fmt(n) {
  return n != null ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'
}

export default function DevisCreation({ results, lot, onSaved, onCancel }) {
  const { user } = useAuth()
  const [tarifs,   setTarifs]   = useState([])
  const [tarifId,  setTarifId]  = useState('')
  const [lignesMap, setLignesMap] = useState({})

  const [form, setForm] = useState({
    client_nom:      '',
    client_ville:    '',
    client_contact:  '',
    client_tel:      '',
    client_adresse:  '',
    intermediaire:   '',
    reference_client:'',
  })

  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.listTarifs().then(r => {
      setTarifs(r.tarifs)
      if (r.tarifs.length === 1) loadLignes(r.tarifs[0].id)
    }).catch(e => setError(e.message))
  }, [])

  async function loadLignes(id) {
    setTarifId(id)
    if (!id) { setLignesMap({}); return }
    try {
      const r = await api.getTarifLignes(id)
      const map = {}
      r.lignes.forEach(l => { map[l.ref] = l })
      setLignesMap(map)
    } catch (e) { setError(e.message) }
  }

  const prix = useMemo(
    () => results ? calcLignesPrix(results, lignesMap) : null,
    [results, lignesMap]
  )

  const tarifNom = tarifs.find(t => t.id === Number(tarifId))?.nom || ''

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const r = await api.createDevis({
        tarif_id:     tarifId ? Number(tarifId) : null,
        ...form,
        chassis_json: JSON.stringify(lot),
        results_json: JSON.stringify(results),
        montant_ht:   prix?.total ?? null,
      })
      setSaveMsg(`Devis ${r.numero} enregistré`)
      if (onSaved) onSaved(r)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  function doExportPDF() {
    exportDevisPDF({
      numero: saveMsg ? saveMsg.split(' ')[1] : null,
      ...form,
      tarif_nom: tarifNom,
      results,
      lot,
      prix,
      user_nom: user?.nom,
    })
  }

  function doExportXLSX() {
    exportDevisXLSX({
      numero: saveMsg ? saveMsg.split(' ')[1] : null,
      ...form,
      tarif_nom: tarifNom,
      results,
      lot,
      prix,
    })
  }

  return (
    <div className="devis-creation">
      <div className="devis-creation-header">
        <div className="card-title">Nouveau devis</div>
        <button className="btn-xs" onClick={onCancel}>✕ Fermer</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="devis-columns">
        {/* Formulaire */}
        <div className="devis-form-col">
          <div className="card">
            <div className="card-title" style={{ fontSize: 13 }}>Informations chantier</div>
            <div className="devis-form-grid">
              <label>
                Nom client
                <input value={form.client_nom} onChange={set('client_nom')} placeholder="Dupont Hassan" />
              </label>
              <label>
                Ville
                <input value={form.client_ville} onChange={set('client_ville')} placeholder="Casablanca" />
              </label>
              <label>
                Contact
                <input value={form.client_contact} onChange={set('client_contact')} placeholder="M. Alami" />
              </label>
              <label>
                Tél.
                <input value={form.client_tel} onChange={set('client_tel')} placeholder="+212 6XX XXX XXX" />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Adresse
                <input value={form.client_adresse} onChange={set('client_adresse')} placeholder="12 rue des Orangers, Casablanca" />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Installateur / Comptoir intermédiaire
                <input value={form.intermediaire} onChange={set('intermediaire')} placeholder="Menuiserie El Fassi" />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Référence chantier
                <input value={form.reference_client} onChange={set('reference_client')} placeholder="CHT-2024-042" />
              </label>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title" style={{ fontSize: 13 }}>Liste de prix</div>
            <select
              className="devis-tarif-select"
              value={tarifId}
              onChange={e => loadLignes(e.target.value)}
            >
              <option value="">— Choisir un tarif —</option>
              {tarifs.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
            {tarifs.length === 0 && (
              <p className="devis-no-tarif">Aucun tarif défini — créez-en un dans Administration → Tarifs</p>
            )}
          </div>
        </div>

        {/* Aperçu prix */}
        <div className="devis-prix-col">
          <div className="card">
            <div className="card-title" style={{ fontSize: 13 }}>Récap tarifaire</div>

            {!tarifId && <p className="devis-prix-hint">Sélectionnez un tarif pour voir les prix</p>}

            {prix && tarifId && (
              <>
                <table className="data-table devis-prix-table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Désignation</th>
                      <th className="col-right">Qté</th>
                      <th>Unité</th>
                      <th className="col-right">PU (MAD)</th>
                      <th className="col-right">Total MAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="devis-section-row"><td colSpan={6}>Profilés</td></tr>
                    {prix.profils.map((p, i) => (
                      <tr key={i}>
                        <td className="col-ref">{p.ref}</td>
                        <td>{p.designation || p.ref}</td>
                        <td className="col-right col-mono">
                          {p.unite === 'ml' ? `${p.metrage} m` : `${p.nbBarres} br`}
                        </td>
                        <td>{p.unite === 'ml' ? 'MAD/ML' : 'MAD/Barre'}</td>
                        <td className="col-right col-mono">{fmt(p.prix)}</td>
                        <td className="col-right col-mono">{fmt(p.total)}</td>
                      </tr>
                    ))}
                    <tr className="devis-subtotal-row">
                      <td colSpan={5}>Sous-total profilés</td>
                      <td className="col-right col-mono">{fmt(prix.totalProfils)}</td>
                    </tr>

                    {prix.accessoires.length > 0 && <>
                      <tr className="devis-section-row"><td colSpan={6}>Accessoires</td></tr>
                      {prix.accessoires.map((a, i) => (
                        <tr key={i}>
                          <td className="col-ref">{a.ref}</td>
                          <td>{a.designation}</td>
                          <td className="col-right col-mono">{a.qte}</td>
                          <td>{a.unite}</td>
                          <td className="col-right col-mono">{fmt(a.prix)}</td>
                          <td className="col-right col-mono">{fmt(a.total)}</td>
                        </tr>
                      ))}
                      <tr className="devis-subtotal-row">
                        <td colSpan={5}>Sous-total accessoires</td>
                        <td className="col-right col-mono">{fmt(prix.totalAcc)}</td>
                      </tr>
                    </>}
                  </tbody>
                </table>

                <div className="devis-total-bar">
                  TOTAL HT : <strong>{fmt(prix.total)} MAD</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="devis-actions">
        {saveMsg && <span className="save-msg">{saveMsg}</span>}
        {error   && <span className="error-msg">{error}</span>}
        <button className="btn-save" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer le devis'}
        </button>
        <button className="btn-export" onClick={doExportPDF} disabled={!prix}>
          📄 PDF
        </button>
        <button className="btn-export" onClick={doExportXLSX} disabled={!prix}>
          📊 Excel
        </button>
        <button className="nav-link" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}
