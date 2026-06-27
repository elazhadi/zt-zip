import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { societeApi, documentApi } from '../lib/api'
import type { Societe, DocumentRef } from '../types'
import { DOMAINES } from '../types'
import { ArrowLeft, Upload, AlertTriangle, CheckCircle, FileText, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function DocStatusBadge({ doc }: { doc?: DocumentRef }) {
  if (!doc) return <span className="badge bg-gray-100 text-gray-500">Non fourni</span>
  const isExpired = doc.date_expiration && new Date(doc.date_expiration) < new Date()
  const expireSoon = doc.date_expiration && !isExpired &&
    new Date(doc.date_expiration).getTime() - Date.now() < 30 * 24 * 3600 * 1000

  if (isExpired) return <span className="badge bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11} />Expiré</span>
  if (expireSoon) return <span className="badge bg-warning-100 text-warning-700 flex items-center gap-1"><AlertTriangle size={11} />Expire bientôt</span>
  return <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={11} />Valide</span>
}

export default function SocieteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numId = Number(id)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<Societe>>({})
  const [dateStatut, setDateStatut] = useState('')
  const [descriptifLang, setDescriptifLang] = useState<'fr' | 'en'>('fr')
  const [descriptifLoading, setDescriptifLoading] = useState(false)

  const { data: societe, isLoading } = useQuery<Societe>({
    queryKey: ['societe', id],
    queryFn: () => societeApi.get(numId),
    enabled: !!id,
  })

  const { data: documents = [] } = useQuery<DocumentRef[]>({
    queryKey: ['societe-docs', id],
    queryFn: () => societeApi.listDocuments(numId),
    enabled: !!id,
  })

  const updateMut = useMutation({
    mutationFn: (data: unknown) => societeApi.update(numId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societe', id] })
      queryClient.invalidateQueries({ queryKey: ['societes'] })
      toast.success('Société mise à jour')
      setEditMode(false)
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const logoMut = useMutation({
    mutationFn: (file: File) => societeApi.uploadLogo(numId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societe', id] })
      toast.success('Logo mis à jour')
    },
  })

  const enteteMut = useMutation({
    mutationFn: (file: File) => societeApi.uploadEntete(numId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societe', id] })
      toast.success('En-tête mis à jour')
    },
  })

  const statutMut = useMutation({
    mutationFn: ({ file, date }: { file: File; date: string }) =>
      societeApi.uploadStatut(numId, file, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societe-docs', id] })
      toast.success('Statut uploadé')
    },
    onError: () => toast.error('Erreur upload statut'),
  })

  const attestationMut = useMutation({
    mutationFn: (file: File) => societeApi.uploadAttestation(numId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societe-docs', id] })
      toast.success('Attestation traitée')
    },
    onError: () => toast.error('Erreur upload attestation'),
  })

  const handleDescriptif = async () => {
    if (!societe) return
    setDescriptifLoading(true)
    try {
      const result = await documentApi.exportDescriptif({ societe_id: numId, langue: descriptifLang })
      window.open(`/uploads/${result.file_path}`, '_blank')
    } catch {
      toast.error('Erreur génération descriptif')
    } finally {
      setDescriptifLoading(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary-600" size={32} />
    </div>
  )

  if (!societe) return <div className="text-gray-500">Société introuvable</div>

  const statutDoc = documents.find(d => d.type_doc === 'statut')
  const attestDocs = documents.filter(d => d.type_doc === 'attestation_ref')

  const startEdit = () => { setForm({ ...societe }); setEditMode(true) }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/referentiel')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {societe.logo_path ? (
            <img src={`/uploads/${societe.logo_path}`} alt={societe.code} className="w-12 h-12 object-contain rounded-lg border border-gray-200" />
          ) : (
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <span className="text-primary-700 font-bold">{societe.code.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{societe.raison_sociale}</h1>
            <p className="text-sm text-gray-500">{societe.code} {societe.forme_juridique ? `— ${societe.forme_juridique}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <button className="btn btn-secondary" onClick={startEdit}>Modifier</button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>Enregistrer</button>
              <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Annuler</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* Identité */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Identité juridique</h2>
            {editMode ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['raison_sociale', 'Raison sociale'],
                  ['forme_juridique', 'Forme juridique'],
                  ['rc', 'RC'],
                  ['if_fiscal', 'IF fiscal'],
                  ['ice', 'ICE'],
                  ['cnss', 'CNSS'],
                  ['patente', 'Patente'],
                  ['gerant', 'Gérant'],
                  ['capital', 'Capital (DH)'],
                  ['email', 'Email'],
                  ['tel', 'Téléphone'],
                  ['adresse', 'Adresse'],
                  ['ville', 'Ville'],
                  ['rib', 'RIB'],
                  ['banque_domiciliation', 'Banque domiciliation'],
                  ['titre_directeur_banque', 'Titre directeur banque'],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input
                      className="input"
                      value={(form as any)[k] || ''}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['RC', societe.rc], ['IF Fiscal', societe.if_fiscal],
                  ['ICE', societe.ice], ['CNSS', societe.cnss],
                  ['Patente', societe.patente], ['Gérant', societe.gerant],
                  ['Capital', societe.capital ? `${societe.capital.toLocaleString('fr-MA')} DH` : undefined],
                  ['Email', societe.email], ['Téléphone', societe.tel],
                  ['Adresse', societe.adresse], ['Ville', societe.ville],
                  ['RIB', societe.rib],
                  ['Banque', societe.banque_domiciliation],
                  ['Titre dir. banque', societe.titre_directeur_banque],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="text-xs text-gray-400">{l}</p>
                    <p className="text-gray-800">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Domaines */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Domaines d'activité</h2>
            {editMode ? (
              <div className="flex flex-wrap gap-2">
                {DOMAINES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const current = form.domaines || []
                      setForm(f => ({
                        ...f,
                        domaines: current.includes(d) ? current.filter(x => x !== d) : [...current, d]
                      }))
                    }}
                    className={clsx(
                      'text-xs px-2 py-1 rounded-full border transition-colors',
                      (form.domaines || []).includes(d)
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(societe.domaines || []).map((d, i) => (
                  <span key={i} className="badge bg-primary-50 text-primary-700">{d}</span>
                ))}
                {(!societe.domaines || societe.domaines.length === 0) && (
                  <p className="text-sm text-gray-400 italic">Aucun domaine configuré</p>
                )}
              </div>
            )}
          </div>

          {/* Documents officiels */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Documents officiels</h2>

            {/* Statut */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Statut juridique</span>
                </div>
                <DocStatusBadge doc={statutDoc} />
              </div>
              {statutDoc && (
                <p className="text-xs text-gray-400 mb-2">
                  Certification : {statutDoc.date_certification}
                  {statutDoc.date_expiration ? ` — Expiration : ${statutDoc.date_expiration}` : ''}
                  {' '}(v{statutDoc.version})
                </p>
              )}
              {statutDoc?.warnings && statutDoc.warnings.length > 0 && (
                <div className="warning-banner text-xs mb-2 py-1.5">
                  <AlertTriangle size={12} />
                  <span>{statutDoc.warnings.join('; ')}</span>
                </div>
              )}
              <div className="flex items-end gap-3 mt-2">
                <div>
                  <label className="label text-xs">Date de certification</label>
                  <input className="input text-sm" type="date" value={dateStatut} onChange={e => setDateStatut(e.target.value)} />
                </div>
                <label className={clsx('btn btn-secondary text-xs cursor-pointer', !dateStatut && 'opacity-50 pointer-events-none')}>
                  <Upload size={13} className="inline mr-1" />
                  Uploader
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx"
                    disabled={!dateStatut}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f && dateStatut) statutMut.mutate({ file: f, date: dateStatut })
                    }}
                  />
                </label>
                {statutMut.isPending && <Loader2 size={16} className="animate-spin text-primary-600" />}
              </div>
            </div>

            {/* Attestations de référence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Attestations de référence ({attestDocs.length})</span>
                <label className="btn btn-secondary text-xs cursor-pointer">
                  <Upload size={13} className="inline mr-1" />
                  Ajouter
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) attestationMut.mutate(f)
                    }}
                  />
                </label>
              </div>
              {attestationMut.isPending && (
                <div className="flex items-center gap-2 text-sm text-primary-600 mb-2">
                  <Loader2 size={14} className="animate-spin" />
                  Extraction IA en cours...
                </div>
              )}
              {attestDocs.length === 0 && !attestationMut.isPending && (
                <p className="text-xs text-gray-400 italic">Aucune attestation</p>
              )}
              <div className="space-y-2">
                {attestDocs.map(doc => {
                  const info = doc.infos_extraites as any || {}
                  return (
                    <div key={doc.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">{info.client || 'Client inconnu'}</span>
                        <DocStatusBadge doc={doc} />
                      </div>
                      {info.activite && <p className="text-gray-600">{info.activite}</p>}
                      <div className="flex gap-3 mt-1 text-gray-500">
                        {info.montant && <span>{Number(info.montant).toLocaleString('fr-MA')} DH</span>}
                        {info.periode && <span>{info.periode}</span>}
                        {info.numero_marche && <span>N° {info.numero_marche}</span>}
                      </div>
                      {doc.warnings?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-warning-600">
                          <AlertTriangle size={11} />
                          <span>{doc.warnings.join('; ')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Logo */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Logo</h2>
            {societe.logo_path && (
              <img src={`/uploads/${societe.logo_path}`} alt="Logo" className="w-full object-contain h-20 mb-3" />
            )}
            <label className="btn btn-secondary text-xs w-full cursor-pointer text-center block">
              <Upload size={13} className="inline mr-1" />
              {societe.logo_path ? 'Changer' : 'Uploader'}
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                const f = e.target.files?.[0]
                if (f) logoMut.mutate(f)
              }} />
            </label>
          </div>

          {/* En-tête */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">En-tête courrier</h2>
            {societe.entete_path && (
              <p className="text-xs text-green-600 flex items-center gap-1 mb-2">
                <CheckCircle size={11} /> En-tête configuré
              </p>
            )}
            <label className="btn btn-secondary text-xs w-full cursor-pointer text-center block">
              <Upload size={13} className="inline mr-1" />
              {societe.entete_path ? 'Changer' : 'Uploader'}
              <input type="file" className="hidden" accept=".docx" onChange={e => {
                const f = e.target.files?.[0]
                if (f) enteteMut.mutate(f)
              }} />
            </label>
            <p className="text-xs text-gray-400 mt-1">Fichier DOCX avec entête + logo</p>
          </div>

          {/* Descriptif fournisseur */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Descriptif fournisseur</h2>
            <div className="flex gap-2 mb-3">
              <button
                className={clsx('flex-1 text-xs py-1.5 rounded-lg border', descriptifLang === 'fr' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600')}
                onClick={() => setDescriptifLang('fr')}
              >FR</button>
              <button
                className={clsx('flex-1 text-xs py-1.5 rounded-lg border', descriptifLang === 'en' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600')}
                onClick={() => setDescriptifLang('en')}
              >EN</button>
            </div>
            <button
              className="btn btn-secondary text-xs w-full"
              onClick={handleDescriptif}
              disabled={descriptifLoading}
            >
              {descriptifLoading ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}
              Générer & Télécharger
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
