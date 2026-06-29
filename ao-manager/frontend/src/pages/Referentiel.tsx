import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { societeApi } from '../lib/api'
import type { Societe } from '../types'
import { Plus, Building2, AlertTriangle, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

function SocieteModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    code: '', raison_sociale: '', forme_juridique: '', rc: '',
    if_fiscal: '', ice: '', cnss: '', patente: '',
    adresse: '', ville: '', gerant: '', capital: '',
    email: '', tel: '', rib: '',
    banque_domiciliation: '', titre_directeur_banque: '',
  })

  const createMut = useMutation({
    mutationFn: (data: unknown) => societeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societes'] })
      toast.success('Société créée')
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erreur lors de la création'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = () => {
    // Convert empty strings to null for optional fields
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(form)) {
      if (k === 'capital') {
        payload[k] = v ? parseFloat(v) : null
      } else if (k === 'code' || k === 'raison_sociale') {
        payload[k] = v
      } else {
        payload[k] = v || null
      }
    }
    createMut.mutate(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="card w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-xl">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white py-1">
          <h2 className="text-base font-semibold text-gray-900">Nouvelle société</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { k: 'code', l: 'Code (unique) *' },
            { k: 'raison_sociale', l: 'Raison sociale *' },
            { k: 'forme_juridique', l: 'Forme juridique' },
            { k: 'rc', l: 'RC' },
            { k: 'if_fiscal', l: 'IF fiscal' },
            { k: 'ice', l: 'ICE' },
            { k: 'cnss', l: 'CNSS' },
            { k: 'patente', l: 'Patente' },
            { k: 'gerant', l: 'Gérant' },
            { k: 'capital', l: 'Capital (DH)' },
            { k: 'email', l: 'Email' },
            { k: 'tel', l: 'Téléphone' },
            { k: 'adresse', l: 'Adresse' },
            { k: 'ville', l: 'Ville' },
            { k: 'rib', l: 'RIB' },
            { k: 'banque_domiciliation', l: 'Banque de domiciliation' },
            { k: 'titre_directeur_banque', l: 'Titre directeur de banque' },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input
                className="input"
                type={k === 'capital' ? 'number' : 'text'}
                value={(form as any)[k]}
                onChange={e => set(k, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 pb-2">
          <button
            className="btn btn-primary flex-1 sm:flex-none"
            onClick={handleCreate}
            disabled={!form.code || !form.raison_sociale || createMut.isPending}
          >
            {createMut.isPending ? 'Création...' : 'Créer'}
          </button>
          <button className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function Referentiel() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: societeApi.list,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Référentiel sociétés</h1>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nouvelle société
        </button>
      </div>

      {societes.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-gray-500 font-medium mb-1">Aucune société configurée</p>
          <p className="text-sm text-gray-400 mb-4">Ajoutez votre première société soumissionnaire</p>
          <button className="btn btn-primary mx-auto" onClick={() => setShowModal(true)}>
            <Plus size={16} className="inline mr-1" /> Ajouter une société
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {societes.map(s => (
            <button
              key={s.id}
              className="card text-left hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/referentiel/${s.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {s.logo_path ? (
                    <img
                      src={`/uploads/${s.logo_path}`}
                      alt={s.code}
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <span className="text-primary-700 font-bold text-sm">{s.code.slice(0, 2)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{s.raison_sociale}</p>
                    <p className="text-xs text-gray-500">{s.code} {s.forme_juridique ? `— ${s.forme_juridique}` : ''}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 mt-1" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
                {s.ice && <span>ICE: {s.ice}</span>}
                {s.rc && <span>RC: {s.rc}</span>}
                {s.ville && <span>{s.ville}</span>}
              </div>

              {s.domaines && s.domaines.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.domaines.slice(0, 3).map((d, i) => (
                    <span key={i} className="badge bg-gray-100 text-gray-600 text-xs">{d.split(' ')[0]}</span>
                  ))}
                  {s.domaines.length > 3 && (
                    <span className="badge bg-gray-100 text-gray-500 text-xs">+{s.domaines.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showModal && <SocieteModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
