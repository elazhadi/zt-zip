import { useState, useEffect } from 'react'

const CONFIGS = ['2VT/2R', '3VT/2R', '4VT/2R', '3VT/3R', '6VT/3R', '4VT/4R', '8VT/4R']

const INIT = { config: '3VT/3R', type: 'porte', L: '', H: '', Q: 1, color: '' }

export default function ChassisForm({ onAdd, prefill, onPrefillConsumed }) {
  const [form, setForm] = useState(INIT)
  const [errors, setErrors] = useState({})
  const [highlighted, setHighlighted] = useState({}) // champs issus d'une photo

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
    if (!form.L || isNaN(L) || L < 300 || L > 8000) e.L = '300 – 8000 mm'
    if (!form.H || isNaN(H) || H < 300 || H > 8000) e.H = '300 – 8000 mm'
    if (!form.Q || isNaN(Q) || Q < 1 || Q > 99)    e.Q = '1 – 99'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onAdd({ config: form.config, type: form.type, L: Number(form.L), H: Number(form.H), Q: Number(form.Q), color: form.color })
    setForm(INIT)
    setErrors({})
    setHighlighted({})
  }

  return (
    <form className="card chassis-form" onSubmit={handleSubmit} noValidate>
      <div className="card-title">Nouveau châssis</div>

      <div className="form-row">
        <label>
          Configuration
          <select className={cls('config')} value={form.config} onChange={e => set('config', e.target.value)}>
            {CONFIGS.map(c => <option key={c}>{c}</option>)}
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
          <input
            type="text" value={form.color}
            onChange={e => set('color', e.target.value)}
            placeholder="ex. Blanc RAL 9016"
          />
        </label>
      </div>

      <button type="submit" className="btn-add">+ Ajouter au chantier</button>
    </form>
  )
}
