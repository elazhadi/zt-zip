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

const { debiterChantier } = M

export default function App() {
  const { user, logout } = useAuth()
  const [view, setView] = useState('calc')          // 'calc' | 'history' | 'login'

  const [lot, setLot] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [prefill, setPrefill] = useState(null)       // pré-remplissage issu d'une photo
  const [saveMsg, setSaveMsg] = useState(null)

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

  // Charge un chantier depuis l'historique dans le calculateur.
  async function loadChantier(id) {
    try {
      const { chassis } = await api.getChantier(id)
      const loaded = chassis.map(c => ({
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

  // Enregistre le chantier courant (nécessite une connexion).
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

  function handleNav(target) {
    if (target === 'history' && !user) { setView('login'); return }
    setView(target)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-logo">⬡</span>
          <h1>ULYSSE 70</h1>
        </div>
        <nav className="app-nav">
          <button className={view === 'calc' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('calc')}>
            Calculateur
          </button>
          <button className={view === 'history' ? 'nav-link active' : 'nav-link'} onClick={() => handleNav('history')}>
            Historique
          </button>
        </nav>
        <div className="app-user">
          {user ? (
            <>
              <span className="user-badge">{user.nom} · {user.role}</span>
              <button className="nav-link" onClick={logout}>Déconnexion</button>
            </>
          ) : (
            <button className="nav-link" onClick={() => setView('login')}>Se connecter</button>
          )}
        </div>
      </header>

      {view === 'login' && (
        <main className="app-centered">
          <Login onSuccess={() => setView('calc')} />
        </main>
      )}

      {view === 'history' && user && (
        <main className="app-centered-wide">
          <History onOpen={loadChantier} />
        </main>
      )}

      {view === 'calc' && (
        <main className="app-main">
          <aside className="app-sidebar">
            <ChassisForm onAdd={addChassis} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
            <PhotoUpload onPrefill={setPrefill} loggedIn={Boolean(user)} onNeedLogin={() => setView('login')} />
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
