import { useState, useEffect } from 'react'
import { api } from '../api/client'
import M from '@ulysse70/moteur'

const ALL_GAMMES = M.listeGammes()
const PLANS = ['trial', 'starter', 'pro', 'enterprise']

export default function Backoffice() {
  const [tenants, setTenants] = useState([])
  const [selected, setSelected] = useState(null)   // détail tenant sélectionné
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    nom: '', slug: '', plan: 'trial', vision_enabled: false, max_users: 5,
    gammes: ['ulysse70'],
  })
  const [formErr, setFormErr] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await api.listTenants()
      setTenants(r.tenants)
    } catch (e) {
      setError(e.message)
    }
  }

  async function selectTenant(id) {
    try {
      const r = await api.getTenant(id)
      setSelected(r)
    } catch (e) {
      setError(e.message)
    }
  }

  function startCreate() {
    setCreating(true)
    setSelected(null)
    setForm({ nom: '', slug: '', plan: 'trial', vision_enabled: false, max_users: 5, gammes: ['ulysse70'] })
    setFormErr(null)
  }

  async function submitCreate(e) {
    e.preventDefault()
    if (!form.nom || !form.slug) { setFormErr('Nom et slug requis'); return }
    try {
      await api.createTenant({
        nom:            form.nom,
        slug:           form.slug,
        plan:           form.plan,
        vision_enabled: form.vision_enabled,
        max_users:      Number(form.max_users),
        gammes:         form.gammes,
      })
      setCreating(false)
      load()
    } catch (e) {
      setFormErr(e.message)
    }
  }

  async function toggleTenantActif(t) {
    try {
      await api.updateTenant(t.id, { actif: !t.actif })
      load()
      if (selected?.tenant?.id === t.id) selectTenant(t.id)
    } catch (e) {
      setError(e.message)
    }
  }

  async function updateSelected(patch) {
    try {
      await api.updateTenant(selected.tenant.id, patch)
      selectTenant(selected.tenant.id)
    } catch (e) {
      setError(e.message)
    }
  }

  function toggleGamme(gid) {
    const cur = form.gammes.includes(gid)
      ? form.gammes.filter(g => g !== gid)
      : [...form.gammes, gid]
    setForm(p => ({ ...p, gammes: cur }))
  }

  return (
    <div className="backoffice">
      <div className="backoffice-sidebar">
        <div className="card-header-row">
          <div className="card-title">Sociétés</div>
          <button className="btn-sm" onClick={startCreate}>+ Nouvelle</button>
        </div>
        {error && <div className="error-msg">{error}</div>}

        {creating && (
          <form className="user-form" onSubmit={submitCreate} noValidate>
            <label>Nom société<input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} /></label>
            <label>Slug (URL)<input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} /></label>
            <label>Plan
              <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                {PLANS.map(pl => <option key={pl}>{pl}</option>)}
              </select>
            </label>
            <label>Max utilisateurs
              <input type="number" min="1" max="500" value={form.max_users}
                onChange={e => setForm(p => ({ ...p, max_users: e.target.value }))} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.vision_enabled}
                onChange={e => setForm(p => ({ ...p, vision_enabled: e.target.checked }))} />
              Lecture photo activée
            </label>
            <div className="gamme-checkboxes">
              <span className="form-label">Gammes accessibles :</span>
              {ALL_GAMMES.map(g => (
                <label key={g.id} className="checkbox-label">
                  <input type="checkbox" checked={form.gammes.includes(g.id)}
                    onChange={() => toggleGamme(g.id)} />
                  {g.label}
                </label>
              ))}
            </div>
            {formErr && <div className="error-msg">{formErr}</div>}
            <div className="form-actions">
              <button type="submit" className="btn-add">Créer</button>
              <button type="button" className="btn-cancel" onClick={() => setCreating(false)}>Annuler</button>
            </div>
          </form>
        )}

        <ul className="tenant-list">
          {tenants.map(t => (
            <li key={t.id}
              className={`tenant-item${selected?.tenant?.id === t.id ? ' active' : ''}${!t.actif ? ' inactive' : ''}`}
              onClick={() => selectTenant(t.id)}
            >
              <div className="tenant-nom">{t.nom}</div>
              <div className="tenant-meta">
                <span className={`plan-badge plan-${t.plan}`}>{t.plan}</span>
                <span className="tenant-stats">{t.nb_users} users · {t.nb_sites} sites</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="backoffice-detail">
        {selected && <TenantDetail data={selected} onUpdate={updateSelected} onToggleActif={toggleTenantActif} />}
        {!selected && !creating && (
          <div className="empty-results">
            <div className="empty-icon">🏢</div>
            <p>Sélectionnez une société dans la liste pour en voir le détail.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TenantDetail({ data, onUpdate, onToggleActif }) {
  const { tenant, users, sites, gammes } = data
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nom:            tenant.nom,
    plan:           tenant.plan,
    vision_enabled: tenant.vision_enabled,
    max_users:      tenant.max_users,
    gammes,
  })

  function toggleGamme(gid) {
    const cur = form.gammes.includes(gid) ? form.gammes.filter(g => g !== gid) : [...form.gammes, gid]
    setForm(p => ({ ...p, gammes: cur }))
  }

  async function save() {
    await onUpdate({
      nom:            form.nom,
      plan:           form.plan,
      vision_enabled: form.vision_enabled,
      max_users:      Number(form.max_users),
      gammes:         form.gammes,
    })
    setEditing(false)
  }

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">{tenant.nom}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-sm" onClick={() => setEditing(e => !e)}>
            {editing ? 'Annuler' : 'Modifier'}
          </button>
          <button className="btn-sm btn-danger" onClick={() => onToggleActif(tenant)}>
            {tenant.actif ? 'Suspendre' : 'Réactiver'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="user-form">
          <label>Nom<input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} /></label>
          <label>Plan
            <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
              {PLANS.map(pl => <option key={pl}>{pl}</option>)}
            </select>
          </label>
          <label>Max utilisateurs
            <input type="number" min="1" value={form.max_users}
              onChange={e => setForm(p => ({ ...p, max_users: e.target.value }))} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={form.vision_enabled}
              onChange={e => setForm(p => ({ ...p, vision_enabled: e.target.checked }))} />
            Lecture photo activée
          </label>
          <div className="gamme-checkboxes">
            <span className="form-label">Gammes accessibles :</span>
            {ALL_GAMMES.map(g => (
              <label key={g.id} className="checkbox-label">
                <input type="checkbox" checked={form.gammes.includes(g.id)} onChange={() => toggleGamme(g.id)} />
                {g.label}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn-add" onClick={save}>Enregistrer</button>
          </div>
        </div>
      ) : (
        <dl className="detail-list">
          <dt>Plan</dt><dd><span className={`plan-badge plan-${tenant.plan}`}>{tenant.plan}</span></dd>
          <dt>Max utilisateurs</dt><dd>{tenant.max_users}</dd>
          <dt>Lecture photo</dt><dd>{tenant.vision_enabled ? '✅ Activée' : '❌ Désactivée'}</dd>
          <dt>Statut</dt><dd>{tenant.actif ? 'Actif' : 'Suspendu'}</dd>
          <dt>Gammes</dt><dd>{gammes.join(', ') || '(toutes)'}</dd>
          <dt>Créé le</dt><dd>{new Date(tenant.cree_le).toLocaleDateString('fr-FR')}</dd>
        </dl>
      )}

      <div style={{ marginTop: '16px' }}>
        <strong>Sites ({sites.length})</strong>
        <ul className="detail-list-items">
          {sites.map(s => <li key={s.id}>{s.nom}{!s.actif ? ' (inactif)' : ''}</li>)}
          {sites.length === 0 && <li style={{ color: 'var(--text-muted)' }}>Aucun</li>}
        </ul>
      </div>

      <div style={{ marginTop: '12px' }}>
        <strong>Utilisateurs ({users.length})</strong>
        <ul className="detail-list-items">
          {users.map(u => (
            <li key={u.id}>
              {u.nom} — {u.email}
              <span className={`role-badge role-${u.role}`} style={{ marginLeft: '6px' }}>{u.role}</span>
              {!u.actif && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>(inactif)</span>}
            </li>
          ))}
          {users.length === 0 && <li style={{ color: 'var(--text-muted)' }}>Aucun</li>}
        </ul>
      </div>
    </div>
  )
}
