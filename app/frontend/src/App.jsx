import { useState } from 'react'
import M from '@ulysse70/moteur'
import ChassisForm from './components/ChassisForm'
import LotPanel from './components/LotPanel'
import ResultsPanel from './components/ResultsPanel'

const { debiterChantier } = M

export default function App() {
  const [lot, setLot] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  function addChassis(chassis) {
    setLot(prev => [...prev, { ...chassis, _id: Date.now() }])
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-logo">⬡</span>
          <h1>ULYSSE 70</h1>
        </div>
        <p>Calculateur de débitage aluminium — Gamme PL600 / Rock Systems</p>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <ChassisForm onAdd={addChassis} />
          <LotPanel lot={lot} onRemove={removeChassis} onCalculate={calculate} />
          {error && <div className="error-msg">Erreur : {error}</div>}
        </aside>

        <section className="app-results">
          {results ? (
            <ResultsPanel results={results} lot={lot} />
          ) : (
            <div className="empty-results">
              <div className="empty-icon">📐</div>
              <p>Saisissez des châssis et cliquez sur<br /><strong>Calculer le débitage</strong></p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
