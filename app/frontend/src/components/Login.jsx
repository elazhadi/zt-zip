import { useState } from 'react'
import { useAuth } from '../api/auth.jsx'

export default function Login({ onSuccess }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card login-card" onSubmit={submit}>
      <div className="card-title">Connexion</div>
      <label className="login-label">
        Email
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
      </label>
      <label className="login-label">
        Mot de passe
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <div className="error-msg">{error}</div>}
      <button className="btn-add" type="submit" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="login-hint">
        Le calculateur fonctionne sans compte. La connexion débloque
        l'enregistrement des chantiers, l'historique et la lecture photo.
      </p>
    </form>
  )
}
