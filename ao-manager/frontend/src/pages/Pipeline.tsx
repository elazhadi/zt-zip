import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { aoApi, societeApi } from '../lib/api'
import type { AppelOffre, AOStatut, Societe } from '../types'
import { STATUT_CONFIG } from '../types'
import { Calendar, Building2, AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react'
import { fmtDH } from '../lib/format'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const COLUMNS: AOStatut[] = [
  'en_instance',
  'en_cours_de_reponse',
  'en_attente_de_resultats',
  'en_adjudication',
  'marche_en_cours',
  'en_paiement',
  'en_garantie',
  'cloture',
  'perdu',
  'annule',
]

function AOCard({ ao, isDragging }: { ao: AppelOffre; isDragging?: boolean }) {
  const navigate = useNavigate()
  const isUrgent = ao.date_limite
    ? new Date(ao.date_limite).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
    : false

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow text-left w-full',
        isDragging ? 'shadow-lg opacity-80' : 'border-gray-200',
        isUrgent && 'border-l-2 border-l-warning-500'
      )}
      onClick={() => navigate(`/ao/${ao.id}`)}
    >
      {ao.reference && (
        <p className="text-xs text-gray-400 font-mono mb-1">{ao.reference}</p>
      )}
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
        {ao.objet || 'Sans objet'}
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {ao.maitre_ouvrage?.nom && (
          <span className="flex items-center gap-1 truncate">
            <Building2 size={11} />
            <span className="truncate">{ao.maitre_ouvrage.nom}</span>
          </span>
        )}
      </div>
      {ao.date_limite && (
        <div className={clsx('flex items-center gap-1 mt-2 text-xs', isUrgent ? 'text-warning-600 font-medium' : 'text-gray-400')}>
          {isUrgent && <AlertTriangle size={11} />}
          <Calendar size={11} />
          {new Date(ao.date_limite).toLocaleDateString('fr-FR')}
        </div>
      )}
      {ao.estimation && (
        <p className="mt-1 text-xs text-gray-500">
          {fmtDH(ao.estimation)}
        </p>
      )}
    </div>
  )
}

function SortableCard({ ao }: { ao: AppelOffre }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ao.id,
    data: { ao },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AOCard ao={ao} isDragging={isDragging} />
    </div>
  )
}

function Column({
  statut, aos, collapsed, onToggle,
}: {
  statut: AOStatut
  aos: AppelOffre[]
  collapsed: boolean
  onToggle: () => void
}) {
  const cfg = STATUT_CONFIG[statut]
  const total = aos.reduce((s, a) => s + (a.estimation || 0), 0)

  if (collapsed) {
    return (
      <div
        className={clsx(
          'flex-shrink-0 w-9 flex flex-col items-center rounded-lg cursor-pointer select-none',
          cfg.bg, 'hover:opacity-80 transition-opacity'
        )}
        onClick={onToggle}
        title={`${cfg.label} (${aos.length})`}
      >
        <div className={clsx('flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-t-lg', cfg.bg)}>
          <ChevronRight size={14} className={cfg.color} />
        </div>
        <div className="flex-1 flex items-center justify-center py-2">
          <span
            className={clsx('text-xs font-semibold whitespace-nowrap', cfg.color)}
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {cfg.label} ({aos.length})
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 w-60 flex flex-col">
      <div className={clsx('flex items-center justify-between px-3 py-2 rounded-t-lg', cfg.bg)}>
        <button
          className={clsx('flex items-center gap-1.5 text-xs font-semibold flex-1 text-left', cfg.color)}
          onClick={onToggle}
          title="Replier"
        >
          <ChevronDown size={13} />
          {cfg.label}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {total > 0 && (
            <span className={clsx('text-xs font-medium', cfg.color)}>
              {fmtDH(total)}
            </span>
          )}
          <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full bg-white', cfg.color)}>
            {aos.length}
          </span>
        </div>
      </div>
      <SortableContext items={aos.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-[100px]">
          {aos.map(ao => (
            <SortableCard key={ao.id} ao={ao} />
          ))}
          {aos.length === 0 && (
            <div className="text-center py-4 text-xs text-gray-400">—</div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Pipeline() {
  const queryClient = useQueryClient()
  const [activeAO, setActiveAO] = useState<AppelOffre | null>(null)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<AOStatut>>(new Set())
  const [selectedSocietes, setSelectedSocietes] = useState<number[]>([])
  const [showSocieteFilter, setShowSocieteFilter] = useState(false)

  const { data: aos = [] } = useQuery<AppelOffre[]>({
    queryKey: ['aos'],
    queryFn: () => aoApi.list(),
  })

  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: () => societeApi.list(),
  })

  const updateStatut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      aoApi.setStatut(id, statut),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aos'] }),
    onError: () => toast.error('Erreur lors du déplacement'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const toggleCollapse = (s: AOStatut) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const toggleSociete = (id: number) => {
    setSelectedSocietes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const clearFilters = () => {
    setSelectedSocietes([])
    setSearch('')
  }

  const filtered = aos.filter(a => {
    const matchSearch = !search || (
      (a.objet || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.maitre_ouvrage?.nom || '').toLowerCase().includes(search.toLowerCase())
    )
    const matchSociete = selectedSocietes.length === 0 ||
      (a.societe_soumissionnaire_id != null && selectedSocietes.includes(a.societe_soumissionnaire_id))
    return matchSearch && matchSociete
  })

  const byStatut = (s: AOStatut) => filtered.filter(a => a.statut === s)
  const hasActiveFilters = search || selectedSocietes.length > 0

  function handleDragStart(event: any) {
    const ao = event.active.data.current?.ao
    if (ao) setActiveAO(ao)
  }

  function handleDragEnd(event: any) {
    setActiveAO(null)
    const { active, over } = event
    if (!over) return
    const draggedAO = active.data.current?.ao as AppelOffre
    if (!draggedAO) return

    const overId = over.id
    const targetStatut = COLUMNS.find(s => {
      const colAOs = byStatut(s)
      return s === overId || colAOs.some(a => a.id === overId)
    })

    if (targetStatut && targetStatut !== draggedAO.statut) {
      updateStatut.mutate({ id: draggedAO.id, statut: targetStatut })
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">Pipeline AO</h1>

        <input
          className="input w-52 text-sm"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Société filter */}
        <div className="relative flex-shrink-0">
          <button
            className={clsx(
              'btn btn-secondary text-sm flex items-center gap-2',
              selectedSocietes.length > 0 && 'border-primary-400 text-primary-700 bg-primary-50'
            )}
            onClick={() => setShowSocieteFilter(v => !v)}
          >
            <Building2 size={15} />
            {selectedSocietes.length > 0
              ? `${selectedSocietes.length} société${selectedSocietes.length > 1 ? 's' : ''}`
              : 'Toutes les sociétés'}
            <ChevronDown size={13} className={clsx('transition-transform', showSocieteFilter && 'rotate-180')} />
          </button>

          {showSocieteFilter && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[220px]">
              <p className="text-xs text-gray-500 font-medium px-2 mb-2">Filtrer par société soumissionnaire</p>
              {societes.length === 0 && (
                <p className="text-xs text-gray-400 px-2 py-1 italic">Aucune société</p>
              )}
              {societes.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSocietes.includes(s.id)}
                    onChange={() => toggleSociete(s.id)}
                    className="accent-primary-600"
                  />
                  <span className="text-xs text-gray-800 font-medium">{s.code}</span>
                  <span className="text-xs text-gray-500 truncate">{s.raison_sociale}</span>
                </label>
              ))}
              {selectedSocietes.length > 0 && (
                <button
                  className="mt-2 w-full text-xs text-red-500 hover:text-red-700 py-1 text-center"
                  onClick={() => setSelectedSocietes([])}
                >
                  Effacer la sélection
                </button>
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
            onClick={clearFilters}
          >
            <X size={13} /> Effacer filtres
          </button>
        )}

        <span className="text-sm text-gray-500 ml-auto flex-shrink-0">
          {filtered.length !== aos.length
            ? `${filtered.length} / ${aos.length} AO`
            : `${aos.length} AO`}
        </span>
      </div>

      {/* Selected sociétés chips */}
      {selectedSocietes.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {selectedSocietes.map(sid => {
            const s = societes.find(x => x.id === sid)
            if (!s) return null
            return (
              <span key={sid} className="flex items-center gap-1 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                {s.code} — {s.raison_sociale}
                <button onClick={() => toggleSociete(sid)} className="ml-1 hover:text-red-600"><X size={11} /></button>
              </span>
            )
          })}
        </div>
      )}

      {/* Board */}
      <div
        className="flex-1 overflow-x-auto pb-4"
        onClick={e => {
          // close dropdown on outside click
          if (showSocieteFilter && !(e.target as Element).closest('.relative')) {
            setShowSocieteFilter(false)
          }
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-2 h-full items-start" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(s => (
              <Column
                key={s}
                statut={s}
                aos={byStatut(s)}
                collapsed={collapsed.has(s)}
                onToggle={() => toggleCollapse(s)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeAO && <AOCard ao={activeAO} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
