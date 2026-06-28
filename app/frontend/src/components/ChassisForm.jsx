import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'

const INIT = { gamme: '', config: '', type: '', L: '', H: '', Q: 1, color: '', renforce: false, renforceTouched: false, epaisseurVitrage: 12, _prefillId: null }

const JOINTS_PL600 = [
  { mm: 6, ref: '6101' }, { mm: 8, ref: '6102' }, { mm: 10, ref: '6103' },
  { mm: 12, ref: '6104' }, { mm: 14, ref: '6105' }, { mm: 16, ref: '6106' },
  { mm: 18, ref: '6107' }, { mm: 20, ref: '6108' }, { mm: 22, ref: '6109' },
  { mm: 24, ref: '6110' }, { mm: 26, ref: '6111' },
]

export default function ChassisForm({ onAdd, prefill, onPrefillConsumed }) {
  const [gammes, setGammes] = useState([])
  const [form, setForm] = useState(INIT)
  const [errors, setErrors] = useState({})
  const [highlighted, setHighlighted] = useState({})
  const [coloris, setColoris] = useState([])

  useEffect(() => {
    api.listGammes()
      .then(r => setGammes(r.gammes))
      .catch(() => {})
    api.listColoris().then(r => setColoris(r.coloris)).catch(() => {})
  }, [])

  const configs = useMemo(
    () => gammes.find(g => g.id === form.gamme)?.configs || [],
    [gammes, form.gamme]
  )

  function typeFromFrappeConfig(configId) {
    if (!configId) return null
    if (configId === 'FEN-FIXE') return 'fixe'
    if (configId === 'FEN-SOUFFLET') return 'basculant'
    if (configId.includes('-OB-')) return 'oscillo_battant'
    if (configId.startsWith('FEN-')) return 'ouvrant_pf'
    if (configId.startsWith('PORTE-')) return 'ouvrant_pf'
    return null
  }

  const isFrappeGamme = useMemo(() => {
    const g = gammes.find(g => g.id === form.gamme)
    return Boolean(g?.configs?.some(c => c.startsWith('FEN-') || c.startsWith('PORTE-')))
  }, [gammes, form.gamme])

  // Montant renforcé : par défaut H ≥ 2000 ⇒ renforcé, sinon simple.
  // Tant que l'utilisateur n'a pas coché manuellement, la case suit la hauteur.
  const autoRenforce = Number(form.H) >= 2000
  const renforce = form.renforceTouched ? form.renforce : autoRenforce

  // Changer de gamme : réinitialise config et type pour forcer un choix explicite.
  // Choix manuel ⇒ on rompt le lien avec le croquis source.
  function setGamme(id) {
    setForm(prev => ({ ...prev, gamme: id, config: '', type: '', _prefillId: null }))
    setErrors(prev => ({ ...prev, gamme: undefined, config: undefined, type: undefined }))
  }

  // Pré-remplissage depuis une photo : remplit + surligne les champs lus.
  useEffect(() => {
    if (!prefill) return
    setForm(prev => {
      const next = { ...prev }
      next._prefillId = prefill._prefillId ?? null
      if (prefill.gamme) next.gamme = prefill.gamme
      if (prefill.config) {
        next.config = prefill.config
        const derivedType = typeFromFrappeConfig(prefill.config)
        if (derivedType) next.type = derivedType
      }
      if (prefill.L !== '' && prefill.L != null) next.L = String(prefill.L)
      if (prefill.H !== '' && prefill.H != null) next.H = String(prefill.H)
      if (prefill.Q != null) next.Q = prefill.Q
      return next
    })
    setHighlighted({
      gamme: Boolean(prefill.gamme),
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
    if (!form.gamme) e.gamme = 'Choisir une gamme'
    if (!isFrappeGamme && !form.type) e.type = "Choisir un type d'ouvrage"
    if (!form.config) e.config = 'Choisir une configuration'
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
    onAdd({ gamme: form.gamme, config: form.config, type: form.type, L: Number(form.L), H: Number(form.H), Q: Number(form.Q), color: form.color, renforce, epaisseurVitrage: form.epaisseurVitrage, _prefillId: form._prefillId })
    // Conserver gamme + type + config + épaisseur vitrage pour faciliter la saisie du prochain châssis similaire.
    setForm(prev => ({ ...INIT, gamme: prev.gamme, config: prev.config, type: prev.type, epaisseurVitrage: prev.epaisseurVitrage }))
    setErrors({})
    setHighlighted({})
  }

  if (gammes.length === 0) {
    return (
      <div className="card chassis-form">
        <div className="card-title">Nouveau châssis</div>
        <p className="catalogue-loading" style={{ padding: '1rem 0' }}>Chargement des gammes…</p>
      </div>
    )
  }

  return (
    <form className="card chassis-form" onSubmit={handleSubmit} noValidate>
      <div className="card-title">Nouveau châssis</div>

      {/* 1. Marque / Gamme */}
      <div className="form-row">
        <label style={{ flex: '1 1 100%' }}>
          Marque / Gamme
          <select className={cls('gamme')} value={form.gamme} onChange={e => setGamme(e.target.value)}>
            <option value="">— Choisir une gamme —</option>
            {gammes.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          {errors.gamme && <span className="field-err">{errors.gamme}</span>}
        </label>
      </div>

      {/* 2. Type d'ouvrage — uniquement pour les gammes coulissantes */}
      {!isFrappeGamme && (
        <div className="form-row">
          <label style={{ flex: '1 1 100%' }}>
            Type d'ouvrage
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="">— Choisir un type —</option>
              <optgroup label="Coulissants">
                <option value="porte">Porte-fenêtre coulissante</option>
                <option value="fenetre">Fenêtre coulissante</option>
              </optgroup>
              <optgroup label="Ouvrants">
                <option value="ouvrant_pf">Ouvrant à la française</option>
                <option value="oscillo_battant">Oscillo-battant</option>
              </optgroup>
              <optgroup label="Fixes &amp; autres">
                <option value="fixe">Panneau fixe</option>
                <option value="basculant">Basculant</option>
              </optgroup>
            </select>
            {errors.type && <span className="field-err">{errors.type}</span>}
          </label>
        </div>
      )}

      {/* 3. Configuration */}
      <div className="form-row">
        <label style={{ flex: '1 1 100%' }}>
          Configuration
          <select
            className={cls('config')}
            value={form.config}
            disabled={!form.gamme}
            onChange={e => {
              const v = e.target.value
              const derivedType = typeFromFrappeConfig(v)
              set('config', v)
              if (derivedType) setForm(prev => ({ ...prev, config: v, type: derivedType }))
            }}
          >
            <option value="">
              {form.gamme ? '— Choisir une configuration —' : '— Sélectionner d\'abord une gamme —'}
            </option>
            {configs.map(c => <option key={c}>{c}</option>)}
          </select>
          {errors.config && <span className="field-err">{errors.config}</span>}
        </label>
      </div>

      {/* 4. Dimensions */}
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

      {/* 5. Quantité + Coloris */}
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
            {coloris.map(c => <option key={c.id} value={c.code}>{c.code}{c.nom ? ` — ${c.nom}` : ''}</option>)}
          </select>
        </label>
      </div>

      {/* 6. Montant renforcé + Épaisseur vitrage — coulissants uniquement. */}
      {!isFrappeGamme && (
        <>
          <div className="form-row">
            <label className="checkbox-row" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={renforce}
                onChange={e => setForm(prev => ({ ...prev, renforce: e.target.checked, renforceTouched: true }))}
                style={{ width: 'auto' }}
              />
              Montant renforcé
              <span className="field-hint" style={{ marginLeft: '0.25rem', opacity: 0.7 }}>
                ({autoRenforce ? 'auto : H ≥ 2000' : 'auto : H < 2000'})
              </span>
            </label>
          </div>
          <div className="form-row">
            <label style={{ flex: '1 1 100%' }}>
              Épaisseur vitrage
              <select value={form.epaisseurVitrage} onChange={e => set('epaisseurVitrage', Number(e.target.value))}>
                {JOINTS_PL600.map(j => (
                  <option key={j.mm} value={j.mm}>{j.mm} mm — {j.ref}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      <button type="submit" className="btn-add">+ Ajouter au chantier</button>
    </form>
  )
}
