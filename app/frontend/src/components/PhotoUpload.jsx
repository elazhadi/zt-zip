import { useState, useEffect } from 'react'
import { api } from '../api/client'

// Bloc lecture croquis : photo → backend (vision) → pré-remplissage.
// La photo NE déclenche AUCUN calcul : le vendeur valide les valeurs lues.
export default function PhotoUpload({ onPrefill, loggedIn, onNeedLogin, consumed }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-sélectionner le même fichier
    if (!file) return
    if (!loggedIn) { onNeedLogin?.(); return }

    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.lireCroquis(file)
      // Chaque châssis lu reçoit un id stable, pour pouvoir le retirer de la
      // liste une fois ajouté au chantier.
      const stamp = Date.now()
      data.chassis = (data.chassis || []).map((c, i) => ({ ...c, _id: `${stamp}-${i}` }))
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Retire de la liste le châssis lu qui vient d'être ajouté au chantier.
  // Quand la liste est vidée, on masque le bloc résultat.
  useEffect(() => {
    if (!consumed) return
    setResult(prev => {
      if (!prev) return prev
      const chassis = prev.chassis.filter(c => c._id !== consumed.id)
      return chassis.length ? { ...prev, chassis } : null
    })
  }, [consumed])

  // Envoie un châssis lu vers le formulaire (pré-remplissage surligné).
  // _prefillId permet de le retirer de la liste après ajout au chantier.
  function useChassis(c) {
    onPrefill({
      _prefillId: c._id,
      gamme: c.gamme || '',
      config: c.config_suggeree || '',
      L: c.largeur_mm ?? '',
      H: c.hauteur_mm ?? '',
      Q: c.quantite ?? 1,
    })
  }

  return (
    <div className="card photo-card">
      <div className="card-title">📷 Lecture d'un croquis</div>

      <label className="photo-drop">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          hidden
        />
        {busy ? 'Lecture en cours…' : 'Photo, galerie ou PDF'}
      </label>

      {!loggedIn && (
        <p className="photo-hint">Connexion requise pour la lecture photo.</p>
      )}
      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="photo-result">
          <p className="photo-warn">⚠️ {result.message || 'Vérifiez les valeurs avant de calculer.'}</p>
          {result.avertissements?.map((a, i) => (
            <p key={i} className="photo-avert">• {a}</p>
          ))}
          {result.chassis.length === 0 && <p className="empty-hint">Aucun châssis lisible.</p>}
          {result.chassis.map((c, i) => (
            <div key={i} className="photo-chassis">
              <div className="photo-chassis-vals">
                {c.gamme_label && <span>{c.gamme_label}</span>}
                <span>{c.config_suggeree || '?'}</span>
                <span>{c.largeur_mm ?? '—'} × {c.hauteur_mm ?? '—'} mm</span>
                <span>×{c.quantite ?? 1}</span>
              </div>
              {c.annotations && <div className="photo-annot">{c.annotations}</div>}
              <button className="btn-prefill" onClick={() => useChassis(c)}>
                Pré-remplir le formulaire →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
