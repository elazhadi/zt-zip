import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aoApi, reponseApi } from '../lib/api'
import type { AppelOffre } from '../types'
import { Upload, FileText, CheckCircle, XCircle, Clock, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Step = 'upload' | 'analysing' | 'review' | 'decision' | 'pricing' | 'generating' | 'done'

export default function AnalyseDAO() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [extracted, setExtracted] = useState<Partial<AppelOffre> | null>(null)
  const [savedAO, setSavedAO] = useState<AppelOffre | null>(null)
  const [pct, setPct] = useState<string>('95')
  const [societeId, setSocieteId] = useState<string>('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [savedFiles, setSavedFiles] = useState<string[]>([])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((accepted: File[]) => setFiles(accepted), []),
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: true,
  })

  const analyseMutation = useMutation({
    mutationFn: (files: File[]) => aoApi.uploadAnalyse(files),
    onMutate: () => setStep('analysing'),
    onSuccess: (data) => {
      if (!data.extracted_data) {
        toast.error(data.error || 'Impossible d\'extraire les données du document')
        setStep('upload')
        return
      }
      setExtracted(data.extracted_data)
      setSavedFiles(data.saved_files || [])
      setWarnings(data.warnings || [])
      setStep('review')
    },
    onError: () => {
      setStep('upload')
      toast.error('Erreur lors de l\'analyse')
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: unknown) => aoApi.saveFromAnalyse(data),
    onSuccess: (ao: AppelOffre) => {
      setSavedAO(ao)
      setStep('decision')
      queryClient.invalidateQueries({ queryKey: ['aos'] })
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const decisionMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) =>
      aoApi.setDecision(id, decision),
    onSuccess: (_, vars) => {
      if (vars.decision === 'oui') {
        setStep('pricing')
      } else {
        toast.success('AO enregistré comme refusé')
        navigate('/pipeline')
      }
    },
  })

  const generateMutation = useMutation({
    mutationFn: (data: unknown) => reponseApi.generate(data),
    onMutate: () => setStep('generating'),
    onSuccess: (data) => {
      setResult(data)
      setWarnings(data.warnings || [])
      setStep('done')
      queryClient.invalidateQueries({ queryKey: ['aos'] })
    },
    onError: () => {
      setStep('pricing')
      toast.error('Erreur lors de la génération')
    },
  })

  const handleAnalyse = () => {
    if (!files.length) return
    analyseMutation.mutate(files)
  }

  const handleSave = () => {
    if (!extracted) return
    saveMutation.mutate({ extracted_data: extracted, saved_files: savedFiles })
  }

  const handleDecision = (decision: 'oui' | 'non') => {
    if (!savedAO) return
    decisionMutation.mutate({ id: savedAO.id, decision })
  }

  const handleGenerate = () => {
    if (!savedAO || !societeId) {
      toast.error('Sélectionnez une société')
      return
    }
    generateMutation.mutate({
      ao_id: savedAO.id,
      societe_id: parseInt(societeId),
      pct_estimation: parseFloat(pct),
    })
  }

  const steps = [
    { key: 'upload', label: 'Téléversement' },
    { key: 'analysing', label: 'Analyse IA' },
    { key: 'review', label: 'Vérification' },
    { key: 'decision', label: 'Décision' },
    { key: 'pricing', label: 'Tarification' },
    { key: 'generating', label: 'Génération' },
    { key: 'done', label: 'Terminé' },
  ]
  const currentIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Analyse DAO</h1>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              i < currentIdx ? 'bg-primary-600 text-white' :
              i === currentIdx ? 'bg-primary-600 text-white ring-2 ring-primary-200' :
              'bg-gray-200 text-gray-500'
            )}>
              {i < currentIdx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={clsx('text-xs', i === currentIdx ? 'text-primary-700 font-medium' : 'text-gray-400')}>{s.label}</span>
            {i < steps.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Upload */}
      {step === 'upload' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Déposer les fichiers DAO</h2>
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-3 text-gray-400" size={36} />
            <p className="text-sm text-gray-600 font-medium">Glissez vos fichiers DAO ici</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX — plusieurs fichiers acceptés</p>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  <FileText size={16} className="text-primary-600" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} Ko</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button
              className="btn btn-primary"
              disabled={!files.length}
              onClick={handleAnalyse}
            >
              Analyser avec l'IA
            </button>
          </div>
        </div>
      )}

      {/* Analysing */}
      {step === 'analysing' && (
        <div className="card flex flex-col items-center py-16 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="text-gray-600 font-medium">Analyse en cours...</p>
          <p className="text-sm text-gray-400">L'IA extrait les informations du DAO</p>
        </div>
      )}

      {/* Review */}
      {step === 'review' && extracted && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Données extraites — Vérification</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Référence</label>
              <input className="input" value={extracted.reference || ''} onChange={e => setExtracted({ ...extracted, reference: e.target.value })} />
            </div>
            <div>
              <label className="label">Date limite</label>
              <input className="input" type="date" value={extracted.date_limite?.slice(0, 10) || ''} onChange={e => setExtracted({ ...extracted, date_limite: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Objet</label>
              <textarea className="input resize-none" rows={3} value={extracted.objet || ''} onChange={e => setExtracted({ ...extracted, objet: e.target.value })} />
            </div>
            <div>
              <label className="label">Maître d'ouvrage</label>
              <input className="input" value={extracted.maitre_ouvrage?.nom || ''} onChange={e => setExtracted({ ...extracted, maitre_ouvrage: { ...extracted.maitre_ouvrage, nom: e.target.value } })} />
            </div>
            <div>
              <label className="label">Estimation (DH HT)</label>
              <input className="input" type="number" value={extracted.estimation || ''} onChange={e => setExtracted({ ...extracted, estimation: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="label">Caution provisoire (DH)</label>
              <input className="input" type="number" value={extracted.caution_provisoire || ''} onChange={e => setExtracted({ ...extracted, caution_provisoire: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="label">Domaine</label>
              <input className="input" value={extracted.domaine || ''} onChange={e => setExtracted({ ...extracted, domaine: e.target.value })} />
            </div>
          </div>

          {extracted.lots && extracted.lots.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Lots / Articles détectés</h3>
              {extracted.lots.map((lot, li) => (
                <div key={li} className="mb-3">
                  <p className="text-sm font-medium text-gray-800">Lot {lot.numero} — {lot.designation}</p>
                  <div className="ml-4 mt-1 space-y-1">
                    {lot.articles.map((art, ai) => (
                      <div key={ai} className="text-xs text-gray-600 flex gap-3">
                        <span className="font-mono w-6">{art.numero}</span>
                        <span className="flex-1">{art.designation}</span>
                        <span className="text-gray-400">{art.quantite} {art.unite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Confirmer et enregistrer'}
            </button>
            <button className="btn btn-secondary" onClick={() => setStep('upload')}>Recommencer</button>
          </div>
        </div>
      )}

      {/* Decision */}
      {step === 'decision' && savedAO && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Décision de répondre</h2>
          <p className="text-sm text-gray-600 mb-6">{savedAO.objet}</p>
          <div className="flex gap-4">
            <button
              className="btn btn-primary flex items-center gap-2 flex-1 justify-center"
              onClick={() => handleDecision('oui')}
              disabled={decisionMutation.isPending}
            >
              <CheckCircle size={18} />
              Oui, nous répondons
            </button>
            <button
              className="btn btn-danger flex items-center gap-2 flex-1 justify-center"
              onClick={() => handleDecision('non')}
              disabled={decisionMutation.isPending}
            >
              <XCircle size={18} />
              Non, nous déclinons
            </button>
          </div>
          <button className="mt-3 text-sm text-gray-400 hover:text-gray-600" onClick={() => navigate(`/ao/${savedAO.id}`)}>
            Voir la fiche complète →
          </button>
        </div>
      )}

      {/* Pricing */}
      {step === 'pricing' && savedAO && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tarification</h2>
          {savedAO.estimation && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-800">
              Estimation MO : <strong>{savedAO.estimation.toLocaleString('fr-MA')} DH HT</strong>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">% de l'estimation</label>
              <input
                className="input"
                type="number"
                min={50}
                max={100}
                step={0.5}
                value={pct}
                onChange={e => setPct(e.target.value)}
              />
              {savedAO.estimation && (
                <p className="text-xs text-gray-500 mt-1">
                  → {((parseFloat(pct) / 100) * savedAO.estimation).toLocaleString('fr-MA', { maximumFractionDigits: 2 })} DH HT
                </p>
              )}
            </div>
            <div>
              <label className="label">Société soumissionnaire</label>
              <input
                className="input"
                placeholder="ID société"
                value={societeId}
                onChange={e => setSocieteId(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={!societeId}>
            Générer les documents et le ZIP
          </button>
        </div>
      )}

      {/* Generating */}
      {step === 'generating' && (
        <div className="card flex flex-col items-center py-16 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="text-gray-600 font-medium">Génération en cours...</p>
          <p className="text-sm text-gray-400">DH, AE, BP, ZIP — Veuillez patienter</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-600" size={24} />
            <h2 className="text-base font-semibold text-gray-900">Documents générés avec succès</h2>
          </div>

          {warnings.length > 0 && (
            <div className="warning-banner mb-4">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Avertissements (non bloquants)</p>
                <ul className="text-sm space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href={reponseApi.downloadZip(result.reponse_id)}
              className="btn btn-primary"
              download
            >
              Télécharger le ZIP
            </a>
            {savedAO && (
              <button className="btn btn-secondary" onClick={() => navigate(`/ao/${savedAO.id}`)}>
                Voir la fiche AO
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => {
              setStep('upload'); setFiles([]); setExtracted(null); setSavedAO(null); setResult(null)
            }}>
              Nouvelle analyse
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
