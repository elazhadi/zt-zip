import { useState } from 'react'
import { Settings, Database, Info } from 'lucide-react'

export default function Parametres() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Settings size={22} /> Paramètres
      </h1>

      <div className="space-y-5">
        {/* Connexion API */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Database size={16} /> Connexion API
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">URL du backend</label>
              <input
                className="input"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
              <p className="text-xs text-gray-400 mt-1">
                Cette valeur est définie au build via VITE_API_URL. Redémarrez l'application pour appliquer un changement d'URL.
              </p>
            </div>
          </div>
        </div>

        {/* À propos */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Info size={16} /> À propos
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Application</span>
              <span className="font-medium">AO Manager</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Version</span>
              <span className="font-medium">3.0</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Référentiel</span>
              <span className="font-medium">Décret n° 2-22-431</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Pays</span>
              <span className="font-medium">Maroc 🇲🇦</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">TVA</span>
              <span className="font-medium">20%</span>
            </div>
          </div>
        </div>

        {/* Règles métier */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Règles métier (informatives)</h2>
          <div className="space-y-2 text-sm text-gray-600">
            {[
              ['Caution provisoire', '1.5% de l\'estimation MO'],
              ['Caution définitive', '3% du montant HT (arrondi supérieur)'],
              ['Retenue de garantie', '7% du montant HT'],
              ['TVA', '20%'],
              ['Délai d\'alerte', '3 jours avant date limite'],
              ['Expiration statut juridique', '3 mois après certification'],
            ].map(([rule, value]) => (
              <div key={rule} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">{rule}</span>
                <span className="font-medium text-right max-w-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
