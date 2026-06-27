import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marcheApi, societeApi } from '../lib/api'
import type { Marche, Societe } from '../types'
import {
  ArrowLeft, CheckCircle, Circle, Upload, FileDown, AlertTriangle,
  Loader2, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ETAPES = [
  'dossier_complementaire',
  'notification_approbation',
  'signature',
  'visa',
  'enregistrement',
  'caution_definitive',
  'os_commencement',
  'execution',
  'pv_provisoire',
  'decompte',
  'facturation',
  'paiement',
  'pv_definitif',
]

const ETAPE_LABELS: Record<string, string> = {
  dossier_complementaire: 'Dossier complémentaire',
  notification_approbation: 'Notification d\'approbation',
  signature: 'Signature du marché',
  visa: 'Visa TGR',
  enregistrement: 'Enregistrement',
  caution_definitive: 'Caution définitive',
  os_commencement: 'OS de commencement',
  execution: 'Exécution',
  pv_provisoire: 'PV de réception provisoire',
  decompte: 'Décompte définitif',
  facturation: 'Facturation',
  paiement: 'Paiement',
  pv_definitif: 'PV de réception définitive / Main levée',
}

export default function MarcheDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numId = Number(id)

  const [selectedEtape, setSelectedEtape] = useState<string>('')
  const [etapeNotes, setEtapeNotes] = useState('')
  const [etapeDate, setEtapeDate] = useState(new Date().toISOString().slice(0, 10))
  const [etapeMontant, setEtapeMontant] = useState('')
  const [showDashboard, setShowDashboard] = useState(false)
  const [datePvRd, setDatePvRd] = useState('')
  const [periodicite, setPeriodicite] = useState('mensuel')

  const { data: marche, isLoading } = useQuery<Marche>({
    queryKey: ['marche', id],
    queryFn: () => marcheApi.get(numId),
    enabled: !!id,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['marche-dashboard', id],
    queryFn: () => marcheApi.dashboard(numId),
    enabled: !!id && showDashboard,
  })

  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: societeApi.list,
  })

  const etapeMut = useMutation({
    mutationFn: (data: unknown) => marcheApi.addEtape(numId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marche', id] })
      toast.success('Étape enregistrée')
      setSelectedEtape('')
      setEtapeNotes('')
    },
  })

  const cautionMut = useMutation({
    mutationFn: () => marcheApi.generateCaution(numId),
    onSuccess: (data) => {
      toast.success('Lettre de caution générée')
      queryClient.invalidateQueries({ queryKey: ['marche', id] })
    },
  })

  const mainLeveeMut = useMutation({
    mutationFn: () => marcheApi.generateMainLevee(numId, datePvRd),
    onSuccess: () => {
      toast.success('Main levée générée')
      queryClient.invalidateQueries({ queryKey: ['marche', id] })
    },
  })

  const excelMut = useMutation({
    mutationFn: () => marcheApi.generateExcel(numId, periodicite),
    onSuccess: (data) => {
      toast.success('Excel généré')
      window.open(`/uploads/${data.file_path}`, '_blank')
    },
  })

  const docUploadMut = useMutation({
    mutationFn: ({ file, etape }: { file: File; etape: string }) =>
      marcheApi.uploadDoc(numId, file, etape),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marche', id] })
      toast.success('Document uploadé')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary-600" size={32} />
    </div>
  )

  if (!marche) return <div className="text-gray-500">Marché introuvable</div>

  const societe = societes.find(s => s.id === marche.societe_id)
  const completedEtapes = new Set((marche.etapes || []).map((e: any) => e.etape))

  const handleAddEtape = () => {
    if (!selectedEtape) return
    etapeMut.mutate({
      etape: selectedEtape,
      date: etapeDate,
      notes: etapeNotes,
      montant_facture: etapeMontant ? parseFloat(etapeMontant) : undefined,
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-0.5">
            {societe?.code} — {marche.numero_marche || `Marché #${marche.id}`}
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            {marche.numero_marche ? `Marché ${marche.numero_marche}` : `Marché #${marche.id}`}
          </h1>
        </div>
        <button
          className="btn btn-secondary flex items-center gap-2"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          <TrendingUp size={16} />
          Dashboard financier
          {showDashboard ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Financial dashboard */}
      {showDashboard && dashboard && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Dashboard financier</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              ['Montant HT', `${(dashboard.montant_ht || 0).toLocaleString('fr-MA')} DH`],
              ['Montant TTC', `${(dashboard.montant_ttc || 0).toLocaleString('fr-MA')} DH`],
              ['Caution définitive', `${(dashboard.caution_definitive || 0).toLocaleString('fr-MA')} DH`],
              ['Retenue garantie (7%)', `${(dashboard.retenue_garantie || 0).toLocaleString('fr-MA')} DH`],
              ['Facturé', `${(dashboard.total_facture || 0).toLocaleString('fr-MA')} DH`],
              ['Reçu', `${(dashboard.total_recu || 0).toLocaleString('fr-MA')} DH`],
              ['Restant dû', `${(dashboard.restant_du || 0).toLocaleString('fr-MA')} DH`],
              ['Avancement', `${dashboard.avancement_pct || 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-base font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="col-span-2">
          <div className="card mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Suivi d'exécution</h2>
            <div className="space-y-2">
              {ETAPES.map((etape, i) => {
                const done = completedEtapes.has(etape)
                const etapeRecord = (marche.etapes || []).find((e: any) => e.etape === etape) as any
                return (
                  <div
                    key={etape}
                    className={clsx(
                      'flex items-start gap-3 p-3 rounded-lg',
                      done ? 'bg-green-50' : 'bg-gray-50'
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {done
                        ? <CheckCircle size={18} className="text-green-600" />
                        : <Circle size={18} className="text-gray-300" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={clsx('text-sm font-medium', done ? 'text-green-800' : 'text-gray-600')}>
                          {i + 1}. {ETAPE_LABELS[etape]}
                        </p>
                        {etapeRecord?.date && (
                          <span className="text-xs text-gray-400">{etapeRecord.date}</span>
                        )}
                      </div>
                      {etapeRecord?.notes && (
                        <p className="text-xs text-gray-500 mt-0.5">{etapeRecord.notes}</p>
                      )}
                      {etapeRecord?.montant_facture && (
                        <p className="text-xs text-gray-500">Facturé : {Number(etapeRecord.montant_facture).toLocaleString('fr-MA')} DH</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Documents */}
          {marche.fichiers && Object.keys(marche.fichiers).length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Documents</h2>
              <div className="space-y-2">
                {Object.entries(marche.fichiers).map(([key, path]) => (
                  <a
                    key={key}
                    href={`/uploads/${path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"
                  >
                    <FileDown size={14} />
                    {key.replace(/_/g, ' ')}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {/* Ajouter étape */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Enregistrer une étape</h2>
            <div className="space-y-2">
              <div>
                <label className="label text-xs">Étape</label>
                <select className="input text-sm" value={selectedEtape} onChange={e => setSelectedEtape(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {ETAPES.map(e => (
                    <option key={e} value={e}>{ETAPE_LABELS[e]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Date</label>
                <input className="input text-sm" type="date" value={etapeDate} onChange={e => setEtapeDate(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Montant facturé (DH)</label>
                <input className="input text-sm" type="number" placeholder="Optionnel" value={etapeMontant} onChange={e => setEtapeMontant(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Notes</label>
                <textarea className="input text-sm resize-none" rows={2} value={etapeNotes} onChange={e => setEtapeNotes(e.target.value)} />
              </div>
              <button
                className="btn btn-primary text-sm w-full"
                onClick={handleAddEtape}
                disabled={!selectedEtape || etapeMut.isPending}
              >
                {etapeMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Générer documents */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Générer documents</h2>
            <div className="space-y-2">
              <button
                className="btn btn-secondary text-xs w-full"
                onClick={() => cautionMut.mutate()}
                disabled={cautionMut.isPending}
              >
                {cautionMut.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                Demande caution définitive
              </button>

              <div className="pt-2 border-t border-gray-100">
                <label className="label text-xs">Date PV réception définitive</label>
                <input className="input text-sm" type="date" value={datePvRd} onChange={e => setDatePvRd(e.target.value)} />
                <button
                  className="btn btn-secondary text-xs w-full mt-2"
                  onClick={() => mainLeveeMut.mutate()}
                  disabled={!datePvRd || mainLeveeMut.isPending}
                >
                  {mainLeveeMut.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                  Main levée caution
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="label text-xs">Périodicité enregistrement</label>
                <select className="input text-sm" value={periodicite} onChange={e => setPeriodicite(e.target.value)}>
                  <option value="mensuel">Mensuel</option>
                  <option value="trimestriel">Trimestriel</option>
                  <option value="annuel">Annuel</option>
                </select>
                <button
                  className="btn btn-secondary text-xs w-full mt-2"
                  onClick={() => excelMut.mutate()}
                  disabled={excelMut.isPending}
                >
                  {excelMut.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                  Excel enregistrement comptable
                </button>
              </div>
            </div>
          </div>

          {/* Upload document */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Uploader un document</h2>
            <div className="space-y-2">
              <div>
                <label className="label text-xs">Étape associée</label>
                <select className="input text-sm" value={selectedEtape} onChange={e => setSelectedEtape(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {ETAPES.map(e => <option key={e} value={e}>{ETAPE_LABELS[e]}</option>)}
                </select>
              </div>
              <label className={clsx('btn btn-secondary text-xs w-full cursor-pointer text-center block', !selectedEtape && 'opacity-50 pointer-events-none')}>
                <Upload size={13} className="inline mr-1" />
                Uploader
                <input
                  type="file"
                  className="hidden"
                  disabled={!selectedEtape}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f && selectedEtape) docUploadMut.mutate({ file: f, etape: selectedEtape })
                  }}
                />
              </label>
              {docUploadMut.isPending && <p className="text-xs text-primary-600">Upload en cours...</p>}
            </div>
          </div>

          {/* Info financière */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Financier</h2>
            <div className="space-y-1 text-sm">
              {marche.montant_ht && (
                <div className="flex justify-between">
                  <span className="text-gray-500">HT</span>
                  <span className="font-medium">{marche.montant_ht.toLocaleString('fr-MA')} DH</span>
                </div>
              )}
              {marche.montant_ttc && (
                <div className="flex justify-between">
                  <span className="text-gray-500">TTC</span>
                  <span className="font-medium">{marche.montant_ttc.toLocaleString('fr-MA')} DH</span>
                </div>
              )}
              {marche.caution_definitive && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Caution déf. (3%)</span>
                  <span className="font-medium text-orange-600">{marche.caution_definitive.toLocaleString('fr-MA')} DH</span>
                </div>
              )}
              {marche.retenue_garantie && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Retenue gar. (7%)</span>
                  <span className="font-medium text-purple-600">{marche.retenue_garantie.toLocaleString('fr-MA')} DH</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
