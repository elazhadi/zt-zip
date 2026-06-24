import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../api/auth.jsx'

const ROLE_LABEL = {
  vendeur: 'Vendeur',
  responsable: 'Responsable',
  admin: 'Administrateur',
  super_admin: 'Super Admin',
}

export default function Profile() {
  const { user, refreshUser } = useAuth()

  const [nom, setNom] = useState(user?.nom || '')
  const [nomMsg, setNomMsg] = useState(null)
  const [nomErr, setNomErr] = useState(null)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwErr, setPwErr] = useState(null)

  async function saveName(e) {
    e.preventDefault()
    setNomMsg(null); setNomErr(null)
    try {
      await api.updateProfile({ nom })
      await refreshUser()
      setNomMsg('Nom mis à jour')
      setTimeout(() => setNomMsg(null), 3000)
    } catch (e) {
      setNomErr(e.message)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwMsg(null); setPwErr(null)
    if (pw.next !== pw.confirm) {
      setPwErr('Les mots de passe ne correspondent pas')
      return
    }
    try {
      await api.changePassword({ current_password: pw.current, new_password: pw.next })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg('Mot de passe modifié')
      setTimeout(() => setPwMsg(null), 4000)
    } catch (e) {
      setPwErr(e.message)
    }
  }

  return (
    <div className="profile-page">
      <div className="card profile-card">
        <div className="card-title">Mon compte</div>
        <dl className="profile-info">
          <dt>Email</dt>
          <dd>{user?.email}</dd>
          <dt>Rôle</dt>
          <dd><span className={`role-badge role-${user?.role}`}>{ROLE_LABEL[user?.role] || user?.role}</span></dd>
        </dl>
      </div>

      <div className="card profile-card">
        <div className="card-title">Nom affiché</div>
        <form className="profile-form" onSubmit={saveName} noValidate>
          <label>
            Nom
            <input value={nom} onChange={e => setNom(e.target.value)} />
          </label>
          {nomErr && <div className="error-msg">{nomErr}</div>}
          {nomMsg && <div className="save-msg">{nomMsg}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-add">Enregistrer</button>
          </div>
        </form>
      </div>

      <div className="card profile-card">
        <div className="card-title">Changer le mot de passe</div>
        <form className="profile-form" onSubmit={savePassword} noValidate>
          <label>
            Mot de passe actuel
            <input type="password" value={pw.current}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
          </label>
          <label>
            Nouveau mot de passe <span className="profile-hint">(8 caractères min.)</span>
            <input type="password" value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
          </label>
          <label>
            Confirmer
            <input type="password" value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </label>
          {pwErr && <div className="error-msg">{pwErr}</div>}
          {pwMsg && <div className="save-msg">{pwMsg}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-add">Modifier</button>
          </div>
        </form>
      </div>
    </div>
  )
}
