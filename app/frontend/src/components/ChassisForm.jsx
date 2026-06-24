import { useState, useEffect, useMemo } from 'react'
import M from '@ulysse70/moteur'
import { api } from '../api/client'

// Gammes disponibles (registre du moteur). S'enrichit quand on ajoute une gamme.
const GAMMES = M.listeGammes()
const DEFAULT_GAMME = GAMMES[0]?.id || 'ulysse70'

const INIT = { gamme: DEFAULT_GAMME, config: '', type: 'porte', L: '', H: '', Q: 1, color: '' }

export default function ChassisForm({ onAdd, prefill, onPrefillConsumed }) {
  const [form, setForm] = useState(() => {
    const first = GAMMES.find(g => g.id === DEFAULT_GAMME)
    return { ...INIT, config: first?.configs[0] || '' }
  })
  const [errors, setErrors] = useState({})
  const [highlighted, setHighlighted] = useState({})
  const [coloris, setColoris] = useState([])

  useEffect(() => {
    api.listColoris().then(r => setColoris(r.coloris)).catch(() => {})
  }, [])

  // Configs proposées = celles de la gamme sélectionnée.
  const configs = useMemo(
    () => GAMMES.find(g => g.id === form.gamme)?.configs || [],
    [form.gamme]
  )

  // Changer de gamme : recale la config sur la première de la nouvelle gamme.
  function setGamme(id) {
    const first = GAMMES.find(g => g.id === id)?.configs[0] || ''
    setForm(prev => ({ ...prev, gamme: id, config: first }))
  }

  // Pré-remplissage depuis une photo : remplit + surligne les champs lus.
  useEffect(() => {
    if (!prefill) return
    setForm(prev => ({
      ...prev,
      config: prefill.config || prev.config,
      L: prefill.L !== '' && prefill.L != null ? String(prefill.L) : prev.L,
      H: prefill.H !== '' && prefill.H != null ? String(prefill.H) : prev.H,
      Q: prefill.Q != null ? prefill.Q : prev.Q,
    }))
    setHighlighted({
      config: Boolean(prefill.config),
      L: prefill.L !== '' && prefill.L != null,
      H: prefill.H !== '' && prefill.H != null,
      Q: prefill.Q != null,
    })
    onPrefillConsumed?.()
  }, [prefill]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }))
    if (highlighted[k]) setHighlighted(prev => ({ ...prev, [k]: false }))
  }

  const cls = (k) => (highlighted[k] ? 'field-prefilled' : undefined)

  function validate() {
    const e = {}
    const L = Number(form.L), H = Number(form.H), Q = Number(form.Q)
    if (!form.config) e.config = 'Configuration requise'
    if (!form.L || isNaN(L) || L < 300 || L > 8000) e.L = '300 – 8000 mm'
    if (!form.H || isNaN(H) || H < 300 || H > 8000) e.H = '300 – 8000 mm'
    if (!form.Q || isNaN(Q) || Q < 1 || Q > 99)    e.Q = '1 – 99'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onAdd({ gamme: form.gamme, config: form.config, type: form.type, L: Number(form.L), H: Number(form.H), Q: Number(form.Q), color: form.color })
    // Réinitialise en conservant la gamme/config courantes.
    setForm(prev => ({ ...INIT, gamme: prev.gamme, config: prev.config }))
    setErrors({})
    setHighlighted({})
  }

  const showGamme = GAMMES.length > 0

  return (
    <form className="card chassis-form" onSubmit={handleSubmit} noValidate>
      <div className="card-title">Nouveau châssis</div>

      {showGamme && (
        <div className="form-row">
          <label style={{ flex: '1 1 100%' }}>
            Marque / Gamme
            <select value={form.gamme} onChange={e => setGamme(e.target.value)}>
              {GAMMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="form-row">
        <label>
          Configuration
          <select className={cls('config')} value={form.config} onChange={e => set('config', e.target.value)}>
            {configs.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Type d'ouvrage
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="porte">Porte-fenêtre (3 côtés)</option>
            <option value="fenetre">Fenêtre (4 côtés)</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>
          Largeur L (mm)
          <input
            className={cls('L')}
            type="number" value={form.L}
            onChange={e => set('L', e.target.value)}
            placeholder="ex. 2895"
            min="300" max="8000" step="1"
          />
          {errors.L && <span className="field-err">{errors.L}</span>}
        </label>
        <label>
          Hauteur H (mm)
          <input
            className={cls('H')}
            type="number" value={form.H}
            onChange={e => set('H', e.target.value)}
            placeholder="ex. 2500"
            min="300" max="8000" step="1"
          />
          {errors.H && <span className="field-err">{errors.H}</span>}
        </label>
      </div>

      <div className="form-row">
        <label>
          Quantité
          <input
            className={cls('Q')}
            type="number" value={form.Q}
            onChange={e => set('Q', e.target.value)}
            min="1" max="99" step="1"
          />
          {errors.Q && <span className="field-err">{errors.Q}</span>}
        </label>
        <label>
          Coloris
          <select value={form.color} onChange={e => set('color', e.target.value)}>
            <option value="">— Coloris —</option>
            {coloris.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
          </select>
        </label>
      </div>

      <button type="submit" className="btn-add">+ Ajouter au chantier</button>
    </form>
  )
}
