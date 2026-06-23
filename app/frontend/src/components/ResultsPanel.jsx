import { useState } from 'react'
import DebitageTab from './tabs/Debitage'
import MiseEnBarreTab from './tabs/MiseEnBarre'
import VitrageTab from './tabs/Vitrage'
import AccessoiresTab from './tabs/Accessoires'
import RecapTab from './tabs/Recap'

const TABS = [
  { id: 'debitage',    label: 'Débitage' },
  { id: 'barres',      label: 'Mise en barre' },
  { id: 'vitrage',     label: 'Vitrage' },
  { id: 'accessoires', label: 'Accessoires' },
  { id: 'recap',       label: 'Récap complet' },
]

export default function ResultsPanel({ results, lot }) {
  const [tab, setTab] = useState('debitage')
  const { stats } = results

  return (
    <div className="results-panel">
      <div className="stats-bar">
        <span>📦 {stats.barres} barres</span>
        <span>📏 {stats.metreTotal_m} m de profilé</span>
        <span>♻️ {stats.chuteTotale_m} m de chute ({stats.chutePct}%)</span>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'debitage'    && <DebitageTab debits={results.debits} />}
        {tab === 'barres'      && <MiseEnBarreTab optim={results.optim} stats={results.stats} />}
        {tab === 'vitrage'     && <VitrageTab vitrage={results.vitrage} />}
        {tab === 'accessoires' && <AccessoiresTab accessoires={results.accessoires} />}
        {tab === 'recap'       && <RecapTab results={results} lot={lot} />}
      </div>
    </div>
  )
}
