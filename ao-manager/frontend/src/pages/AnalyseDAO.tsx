import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aoApi, reponseApi } from '../lib/api'
import type { AppelOffre, Lot } from '../types'
import { fmtNum } from '../lib/format'
import { Upload, FileText, CheckCircle, XCircle, ChevronRight, AlertTriangle, Loader2, Trash2, Eye } from 'lucide-react'
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
  const [showDocs, setShowDocs] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((accepted: File[]) => setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !names.has(f.name))]
    }), []),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  })

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

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
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      toast.error(detail ? `Erreur : ${detail}` : 'Erreur lors de la sauvegarde')
    },
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

  // Helpers for editing articles in the lots
  const updateArticle = (li: number, ai: number, field: string, value: any) => {
    if (!extracted?.lots) return
    const lots: Lot[] = JSON.parse(JSON.stringify(extracted.lots))
    const art = lots[li].articles[ai] as any
    art[field] = value
    if (field === 'prix_unitaire' || field === 'quantite') {
      art.montant = parseFloat(((art.prix_unitaire || 0) * (art.quantite || 0)).toFixed(2))
    }
    if (field === 'montant' && (art.quantite || 0) > 0) {
      art.prix_unitaire = parseFloat((value / art.quantite).toFixed(2))
    }
    setExtracted({ ...extracted, lots })
  }

  const lotTotal = (lot: Lot) =>
    lot.articles.reduce((s, a: any) => s + (a.montant || 0), 0)

  const grandTotal = () =>
    (extracted?.lots || []).reduce((s, l) => s + lotTotal(l), 0)

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
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, ZIP — plusieurs fichiers acceptés</p>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  <FileText size={16} className="text-primary-600 flex-shrink-0" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                  <button
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={e => { e.stopPropagation(); removeFile(i) }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
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

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="warning-banner mb-4">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <ul className="text-sm space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Document list */}
          {savedFiles.length > 0 && (
            <div className="mb-4">
              <button
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium mb-2"
                onClick={() => setShowDocs(v => !v)}
              >
                <Eye size={15} />
                {showDocs ? 'Masquer' : 'Voir'} les documents chargés ({savedFiles.length})
              </button>
              {showDocs && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  {savedFiles.map((p, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono truncate">{p.split('/').pop()}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Référence</label>
              <input className="input" value={extracted.reference || ''} onChange={e => setExtracted({ ...extracted, reference: e.target.value })} />
            </div>
            <div>
              <label className="label">Date et heure limite</label>
              <input
                className="input"
                type="datetime-local"
                value={extracted.date_limite ? extracted.date_limite.replace(' ', 'T').slice(0, 16) : ''}
                onChange={e => setExtracted({ ...extracted, date_limite: e.target.value.replace('T', ' ') })}
              />
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
              <label className="label">Procédure</label>
              <input className="input" value={extracted.procedure || ''} onChange={e => setExtracted({ ...extracted, procedure: e.target.value })} />
            </div>
            <div>
              <label className="label">Estimation MO (DH TTC)</label>
              <input className="input" type="number" value={extracted.estimation ?? ''} onChange={e => setExtracted({ ...extracted, estimation: parseFloat(e.target.value) || undefined })} />
              {extracted.estimation != null && (
                <p className="text-xs text-gray-400 mt-1">{fmtNum(extracted.estimation)} DH TTC</p>
              )}
            </div>
            <div>
              <label className="label">Caution provisoire (DH)</label>
              <input className="input" type="number" value={extracted.caution_provisoire ?? ''} onChange={e => setExtracted({ ...extracted, caution_provisoire: parseFloat(e.target.value) || undefined })} />
              {extracted.caution_provisoire != null && (
                <p className="text-xs text-gray-400 mt-1">{fmtNum(extracted.caution_provisoire)} DH</p>
              )}
            </div>
            <div>
              <label className="label">Domaine</label>
              <input className="input" value={extracted.domaine || ''} onChange={e => setExtracted({ ...extracted, domaine: e.target.value })} />
            </div>
            <div>
              <label className="label">Délai exécution</label>
              <div className="flex gap-2">
                <input
                  className="input w-24"
                  type="number"
                  placeholder="ex: 90"
                  value={(extracted.delai_execution as any)?.valeur ?? ''}
                  onChange={e => setExtracted({ ...extracted, delai_execution: { ...(extracted.delai_execution as any), valeur: parseInt(e.target.value) || null } as any })}
                />
                <select
                  className="input flex-1"
                  value={(extracted.delai_execution as any)?.unite || 'jours'}
                  onChange={e => setExtracted({ ...extracted, delai_execution: { ...(extracted.delai_execution as any), unite: e.target.value } as any })}
                >
                  <option value="jours">jours</option>
                  <option value="mois">mois</option>
                  <option value="semaines">semaines</option>
                </select>
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">URL portail marchés publics</label>
              <input
                className="input"
                type="url"
                placeholder="https://www.marchespublics.gov.ma/..."
                value={(extracted as any).url_portail || ''}
                onChange={e => setExtracted({ ...extracted, url_portail: e.target.value } as any)}
              />
            </div>
          </div>

          {/* Bordereau des prix complet */}
          {extracted.lots && extracted.lots.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Bordereau des prix — Articles détectés</h3>
              {extracted.lots.map((lot, li) => (
                <div key={li} className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-t-lg border border-gray-200">
                    Lot {lot.numero} — {lot.designation}
                  </p>
                  <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-x-auto">
                    <table className="w-full text-xs min-w-[700px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-2 py-2 text-gray-500 font-medium w-8">#</th>
                          <th className="text-left px-2 py-2 text-gray-500 font-medium">Désignation</th>
                          <th className="text-right px-2 py-2 text-gray-500 font-medium w-16">Qté</th>
                          <th className="text-left px-2 py-2 text-gray-500 font-medium w-14">Unité</th>
                          <th className="text-right px-2 py-2 text-gray-500 font-medium w-28">P.U. HT (DH)</th>
                          <th className="text-right px-2 py-2 text-gray-500 font-medium w-32">Montant HT (DH)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lot.articles.map((art, ai) => (
                          <tr key={ai} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-1.5 font-mono text-gray-400">{art.numero}</td>
                            <td className="px-2 py-1.5 text-gray-800">
                              <div>{art.designation}</div>
                              {(art as any).specifications_techniques && (
                                <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{(art as any).specifications_techniques}</div>
                              )}
                              {(art as any).marque_exigee && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                                  Marque : {(art as any).marque_exigee}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-right text-gray-700">{art.quantite ?? '—'}</td>
                            <td className="px-2 py-1.5 text-gray-500">{art.unite}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                className="w-full text-right border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-primary-400"
                                placeholder="—"
                                value={(art as any).prix_unitaire || ''}
                                onChange={e => updateArticle(li, ai, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right font-medium text-gray-800">
                              {(art as any).montant ? fmtNum((art as any).montant) : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                          <td colSpan={5} className="px-2 py-2 text-right text-gray-700 text-xs">Total Lot {lot.numero} HT</td>
                          <td className="px-2 py-2 text-right text-gray-900 text-xs">
                            {lotTotal(lot) > 0 ? `${fmtNum(lotTotal(lot))} DH` : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {extracted.lots.length > 1 && grandTotal() > 0 && (
                <div className="flex justify-end">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 text-sm">
                    <span className="text-primary-700 font-semibold">Total général HT : </span>
                    <span className="text-primary-900 font-bold">{fmtNum(grandTotal())} DH</span>
                  </div>
                </div>
              )}
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
              Estimation MO : <strong>{fmtNum(savedAO.estimation)} DH TTC</strong>
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
                  → {fmtNum((parseFloat(pct) / 100) * savedAO.estimation, 2)} DH HT
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
