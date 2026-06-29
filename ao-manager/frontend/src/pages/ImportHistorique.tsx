import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aoApi } from '../lib/api'
import { fmtDH } from '../lib/format'
import { STATUT_CONFIG } from '../types'
import type { AOStatut } from '../types'
import { Upload, FileArchive, CheckCircle, XCircle, Loader2, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface ImportedItem {
  id: string
  fileName: string
  status: 'pending' | 'analysing' | 'done' | 'error'
  error?: string
  extracted?: Record<string, any>
}

const STATUT_OPTIONS = Object.entries(STATUT_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))

export default function ImportHistorique() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ImportedItem[]>([])
  const [phase, setPhase] = useState<'drop' | 'review' | 'done'>('drop')
  const [savedCount, setSavedCount] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((accepted: File[]) => {
      const newItems = accepted
        .filter(f => f.name.toLowerCase().endsWith('.zip'))
        .map(f => ({
          id: `${f.name}-${f.size}-${Date.now()}`,
          fileName: f.name,
          status: 'pending' as const,
          _file: f,
        }))
      setItems(prev => [...prev, ...newItems as any])
    }, []),
    accept: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
    multiple: true,
  })

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const runAnalysis = async () => {
    const pending = (items as any[]).filter(i => i.status === 'pending' && i._file)
    if (!pending.length) return
    setPhase('review')

    for (const item of pending) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'analysing' } : i))
      try {
        const result = await aoApi.importHistorique(item._file)
        if (result.error || !result.extracted_data) {
          setItems(prev => prev.map(i => i.id === item.id
            ? { ...i, status: 'error', error: result.error || 'Analyse échouée' }
            : i))
        } else {
          setItems(prev => prev.map(i => i.id === item.id
            ? { ...i, status: 'done', extracted: result.extracted_data }
            : i))
        }
      } catch (e: any) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, status: 'error', error: e?.message || 'Erreur réseau' }
          : i))
      }
    }
  }

  const updateExtracted = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(i =>
      i.id === id && i.extracted ? { ...i, extracted: { ...i.extracted, [field]: value } } : i
    ))
  }

  const confirmMutation = useMutation({
    mutationFn: (items: unknown[]) => aoApi.confirmHistoriqueBulk(items),
    onSuccess: (data) => {
      setSavedCount(data.count)
      setPhase('done')
      queryClient.invalidateQueries({ queryKey: ['aos'] })
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })

  const handleConfirm = () => {
    const toSave = items.filter(i => i.status === 'done' && i.extracted).map(i => i.extracted)
    if (!toSave.length) { toast.error('Aucun AO analysé à confirmer'); return }
    confirmMutation.mutate(toSave)
  }

  const doneItems = items.filter(i => i.status === 'done')
  const errorItems = items.filter(i => i.status === 'error')
  const analysing = items.some(i => i.status === 'analysing')

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Import historique AO</h1>
      <p className="text-sm text-gray-500 mb-6">
        Déposez vos archives ZIP (un ZIP par AO), chacune contenant le DAO, les réponses, le marché et les documents de suivi.
        L'IA analysera chaque dossier et reconstituera la fiche AO avec le statut approprié.
      </p>

      {phase === 'done' && (
        <div className="card mb-6 flex items-center gap-3 bg-green-50 border border-green-200">
          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          <div>
            <p className="font-semibold text-green-800">{savedCount} AO importé{savedCount > 1 ? 's' : ''} avec succès</p>
            <p className="text-sm text-green-700">Vous pouvez les retrouver dans le Pipeline.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-primary" onClick={() => navigate('/pipeline')}>Voir le Pipeline</button>
            <button className="btn btn-secondary" onClick={() => { setItems([]); setPhase('drop') }}>Nouvel import</button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {phase !== 'done' && (
        <div className="card mb-6">
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-3 text-gray-400" size={36} />
            <p className="text-sm text-gray-600 font-medium">Glissez vos fichiers ZIP ici</p>
            <p className="text-xs text-gray-400 mt-1">Un ZIP par AO — plusieurs fichiers acceptés</p>
          </div>

          {items.length > 0 && (
            <div className="mt-4 space-y-2">
              {items.map(item => (
                <div key={item.id} className={clsx(
                  'flex items-center gap-2 text-sm rounded-lg px-3 py-2',
                  item.status === 'error' ? 'bg-red-50' : item.status === 'done' ? 'bg-green-50' : 'bg-gray-50'
                )}>
                  {item.status === 'analysing' && <Loader2 size={16} className="animate-spin text-primary-600 flex-shrink-0" />}
                  {item.status === 'done' && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                  {item.status === 'error' && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                  {item.status === 'pending' && <FileArchive size={16} className="text-gray-400 flex-shrink-0" />}
                  <span className="flex-1 truncate text-gray-700">{item.fileName}</span>
                  {item.status === 'error' && <span className="text-xs text-red-500 truncate max-w-xs">{item.error}</span>}
                  {item.status === 'pending' && (
                    <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              className="btn btn-primary flex items-center gap-2"
              disabled={!items.some(i => i.status === 'pending') || analysing}
              onClick={runAnalysis}
            >
              {analysing ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {analysing ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
            </button>
          </div>
        </div>
      )}

      {/* Review table */}
      {phase === 'review' && doneItems.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Vérification — {doneItems.length} AO analysé{doneItems.length > 1 ? 's' : ''}
              {errorItems.length > 0 && <span className="text-red-500 ml-2 text-sm">({errorItems.length} erreur{errorItems.length > 1 ? 's' : ''})</span>}
            </h2>
          </div>

          <div className="space-y-4">
            {doneItems.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileArchive size={16} className="text-primary-600 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate">{item.fileName}</span>
                  {item.extracted?.notes_import && (
                    <span className="ml-auto text-xs text-gray-500 italic truncate max-w-sm">{item.extracted.notes_import}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Référence</label>
                    <input
                      className="input"
                      value={item.extracted?.reference || ''}
                      onChange={e => updateExtracted(item.id, 'reference', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Maître d'ouvrage</label>
                    <input
                      className="input"
                      value={item.extracted?.maitre_ouvrage?.nom || ''}
                      onChange={e => updateExtracted(item.id, 'maitre_ouvrage', {
                        ...item.extracted?.maitre_ouvrage, nom: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="label">Statut</label>
                    <select
                      className="input"
                      value={item.extracted?.statut || 'en_instance'}
                      onChange={e => updateExtracted(item.id, 'statut', e.target.value)}
                    >
                      {STATUT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="label">Objet</label>
                    <textarea
                      className="input resize-none"
                      rows={2}
                      value={item.extracted?.objet || ''}
                      onChange={e => updateExtracted(item.id, 'objet', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Estimation MO (DH HT)</label>
                    <input
                      className="input"
                      type="number"
                      value={item.extracted?.estimation || ''}
                      onChange={e => updateExtracted(item.id, 'estimation', parseFloat(e.target.value) || null)}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="label">Montant marché HT (DH)</label>
                    <input
                      className="input"
                      type="number"
                      value={item.extracted?.montant_marche_ht || ''}
                      onChange={e => updateExtracted(item.id, 'montant_marche_ht', parseFloat(e.target.value) || null)}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="label">N° marché</label>
                    <input
                      className="input"
                      value={item.extracted?.numero_marche || ''}
                      onChange={e => updateExtracted(item.id, 'numero_marche', e.target.value)}
                      placeholder="—"
                    />
                  </div>
                </div>
                {/* Summary row */}
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  {item.extracted?.estimation && <span>Estimation : <strong>{fmtDH(item.extracted.estimation)}</strong></span>}
                  {item.extracted?.montant_marche_ht && <span>Marché : <strong>{fmtDH(item.extracted.montant_marche_ht)}</strong></span>}
                  {item.extracted?.decision && <span>Décision : <strong>{item.extracted.decision === 'oui' ? 'Répondu' : 'Non répondu'}</strong></span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {confirmMutation.isPending ? 'Enregistrement...' : `Importer ${doneItems.length} AO`}
            </button>
            <button className="btn btn-secondary" onClick={() => { setItems([]); setPhase('drop') }}>
              Recommencer
            </button>
          </div>
        </div>
      )}

      {/* Still analysing, no done items yet */}
      {phase === 'review' && doneItems.length === 0 && analysing && (
        <div className="card flex flex-col items-center py-12 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="text-gray-600 font-medium">Analyse des dossiers en cours...</p>
          <p className="text-sm text-gray-400">L'IA lit chaque document pour reconstituer les fiches AO</p>
        </div>
      )}
    </div>
  )
}
