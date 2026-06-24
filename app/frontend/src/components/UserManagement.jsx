import { useState, useEffect } from 'react'
import { api } from '../api/client'

const ROLES = ['vendeur', 'responsable', 'admin']
const ROLE_LABEL = { vendeur: 'Vendeur', responsable: 'Responsable', admin: 'Admin' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [sites, setSites] = useState([])
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState(null)

  const [form, setForm] = useState({ nom: '', email: '', password: '', role: 'vendeur', site_id: '' })
  const [formErr, setFormErr] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [u, s] = await Promise.all([api.listUsers(), api.listSites()])
      setUsers(u.users)
      setSites(s.sites)
    } catch (e) {
      setError(e.message)
    }
  }

  function startCreate() {
    setCreating(true)
    setEditId(null)
    setForm({ nom: '', email: '', password: '', role: 'vendeur', site_id: '' })
    setFormErr(null)
  }

  function startEdit(u) {
    setEditId(u.id)
    setCreating(false)
    setForm({ nom: u.nom, email: u.email, password: '', role: u.role, site_id: u.site_id || '' })
    setFormErr(null)
  }

  function cancelForm() {
    setCreating(false)
    setEditId(null)
    setFormErr(null)
  }

  async function submitCreate(e) {
    e.preventDefault()
    if (!form.nom || !form.email || !form.password) {
      setFormErr('Nom, email et mot de passe requis')
      return
    }
    try {
      await api.createUser({
        nom:      form.nom,
        email:    form.email,
        password: form.password,
        role:     form.role,
        site_id:  form.site_id || null,
      })
      setCreating(false)
      load()
    } catch (e) {
      setFormErr(e.message)
    }
  }

  async function submitEdit(e) {
    e.preventDefault()
    try {
      await api.updateUser(editId, {
        nom:     form.nom,
        role:    form.role,
        site_id: form.site_id || null,
      })
      setEditId(null)
      load()
    } catch (e) {
      setFormErr(e.message)
    }
  }

  async function toggleActif(u) {
    try {
      if (u.actif) {
        await api.deactivateUser(u.id)
      } else {
        await api.updateUser(u.id, { actif: true })
      }
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="card user-mgmt">
      <div className="card-header-row">
        <div className="card-title">Gestion des utilisateurs</div>
        <button className="btn-sm" onClick={startCreate}>+ Nouvel utilisateur</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {(creating || editId != null) && (
        <form className="user-form" onSubmit={creating ? submitCreate : submitEdit} noValidate>
          <div className="form-row">
            <label>
              Nom
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} disabled={editId != null}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </label>
          </div>
          {creating && (
            <div className="form-row">
              <label style={{ flex: '1 1 100%' }}>
                Mot de passe
                <input type="password" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </label>
            </div>
          )}
          <div className="form-row">
            <label>
              Rôle
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <label>
              Site
              <select value={form.site_id} onChange={e => setForm(p => ({ ...p, site_id: e.target.value }))}>
                <option value="">— Aucun site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </label>
          </div>
          {formErr && <div className="error-msg">{formErr}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-add">{creating ? 'Créer' : 'Enregistrer'}</button>
            <button type="button" className="btn-cancel" onClick={cancelForm}>Annuler</button>
          </div>
        </form>
      )}

      <table className="user-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Site</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={u.actif ? '' : 'user-inactive'}>
              <td>{u.nom}</td>
              <td>{u.email}</td>
              <td><span className={`role-badge role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
              <td>{u.site_nom || '—'}</td>
              <td>
                <span className={u.actif ? 'status-active' : 'status-inactive'}>
                  {u.actif ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="user-actions">
                <button className="btn-xs" onClick={() => startEdit(u)}>Modifier</button>
                <button className="btn-xs btn-danger" onClick={() => toggleActif(u)}>
                  {u.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun utilisateur</td></tr>
          )}
        </tbody>
      </table>

    </div>
  )
}
