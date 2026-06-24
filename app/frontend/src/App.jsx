import { useState } from 'react'
import M from '@ulysse70/moteur'
import { useAuth } from './api/auth.jsx'
import { api } from './api/client'
import ChassisForm from './components/ChassisForm'
import LotPanel from './components/LotPanel'
import ResultsPanel from './components/ResultsPanel'
import PhotoUpload from './components/PhotoUpload'
import Login from './components/Login'
import History from './components/History'
import Landing from './components/Landing'
import UserManagement from './components/UserManagement'
import Backoffice from './components/Backoffice'

const { debiterChantier } = M

export default function App() {
  const { user, logout } = useAuth()
  const [view, setView] = useState('landing')    // landing|login|calc|history|users|backoffice

  const [lot, setLot] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [saveMsg, setSaveMsg] = useState(null)

  // Quand l'utilisateur se connecte, passe directement au calculateur.
  function handleLoginSuccess() {
    setView('calc')
  }

  function addChassis(chassis) {
    setLot(prev => [...prev, { ...chassis, _id: Date.now() + Math.random() }])
    setResults(null)
  }
  function removeChassis(id) {
    setLot(prev => prev.filter(c => c._id !== id))
    setResults(null)
  }
  function calculate() {
    if (lot.length === 0) return
    try {
      setError(null)
      setResults(debiterChantier(lot))
    } catch (e) {
      setError(e.message)
    }
  }

  async function loadChantier(id) {
    try {
      const { chassis } = await api.getChantier(id)
      const loaded = chassis.map(c => ({
        gamme: c.gamme || 'ulysse70',
        config: c.config, type: c.type_ouvrage, L: c.largeur, H: c.hauteur,
        Q: c.quantite, color: c.coloris || '', _id: c.id,
      }))
      setLot(loaded)
      setResults(debiterChantier(loaded))
      setView('calc')
    } catch (e) {
      setError(e.message)
    }
  }

  async function saveChantier() {
    if (!user) { setView('login'); return }
    if (lot.length === 0) return
    const ref = window.prompt('Référence client pour ce chantier ?', '')
    if (ref === null) return
    try {
      setSaveMsg(null)
      await api.createChantier({ reference_client: ref, chassis: lot })
      setSaveMsg('Chantier enregistré ✓')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleLogout() {
    try { await api.logout() } catch { /* ignore */ }
    logout()
    setView('landing')
  }

  function handleNav(target) {
    if (!user && target !== 'landing' && target !== 'login') {
      setView('login')
      return
    }
    setView(target)
  }

  // Page d'accueil publique si non connecté.
  if (view === 'landing' && !user) {
    return <Landing onLogin={() => setView('login')} />
  }

  // Redirige landing vers calc si déjà connecté.
  const activeView = (view === 'landing' && user) ? 'calc' : view

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title" style={{ cursor: 'pointer' }} onClick={() => handleNav(user ? 'calc' : 'landing')}>
          <span className="app-logo">⬡</span>
          <h1>Gabarys</h1>
        </div>
        {user && (
          <nav className="app-nav">
            <button className={activeView === 'calc' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('calc')}>
              Calculateur
            </button>
            <button className={activeView === 'history' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('history')}>
              Historique
            </button>
            {(user.role === 'admin') && (
              <button className={activeView === 'users' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('users')}>
                Utilisateurs
              </button>
            )}
            {user.role === 'super_admin' && (
              <button className={activeView === 'backoffice' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('backoffice')}>
                Backoffice
              </button>
            )}
          </nav>
        )}
        <div className="app-user">
          {user ? (
            <>
              <span className="user-badge">{user.nom} · {user.role}</span>
              <button className="nav-link" onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <button className="nav-link" onClick={() => setView('login')}>Se connecter</button>
          )}
        </div>
      </header>

      {activeView === 'login' && (
        <main className="app-centered">
          <Login onSuccess={handleLoginSuccess} />
        </main>
      )}

      {activeView === 'history' && user && (
        <main className="app-centered-wide">
          <History onOpen={loadChantier} />
        </main>
      )}

      {activeView === 'users' && user && (user.role === 'admin' || user.role === 'super_admin') && (
        <main className="app-centered-wide">
          <UserManagement />
        </main>
      )}

      {activeView === 'backoffice' && user && user.role === 'super_admin' && (
        <main className="app-centered-wide">
          <Backoffice />
        </main>
      )}

      {activeView === 'calc' && user && (
        <main className="app-main">
          <aside className="app-sidebar">
            <ChassisForm onAdd={addChassis} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
            {user.vision_enabled !== false && (
              <PhotoUpload onPrefill={setPrefill} loggedIn={Boolean(user)} onNeedLogin={() => setView('login')} />
            )}
            <LotPanel lot={lot} onRemove={removeChassis} onCalculate={calculate} />
            <div className="sidebar-actions">
              <button className="btn-save" onClick={saveChantier} disabled={lot.length === 0}>
                💾 Enregistrer le chantier
              </button>
              {saveMsg && <div className="save-msg">{saveMsg}</div>}
            </div>
            {error && <div className="error-msg">Erreur : {error}</div>}
          </aside>

          <section className="app-results">
            {results ? (
              <ResultsPanel results={results} lot={lot} />
            ) : (
              <div className="empty-results">
                <div className="empty-icon">📐</div>
                <p>Saisissez des châssis (ou importez une photo) et cliquez sur<br /><strong>Calculer le débitage</strong></p>
              </div>
            )}
          </section>
        </main>
      )}

    </div>
  )
}
