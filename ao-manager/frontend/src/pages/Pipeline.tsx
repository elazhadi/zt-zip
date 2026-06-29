import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { aoApi } from '../lib/api'
import type { AppelOffre, AOStatut } from '../types'
import { STATUT_CONFIG } from '../types'
import { Calendar, Building2, AlertTriangle, ChevronRight } from 'lucide-react'
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
          {new Date(ao.date_limite).toLocaleDateString('fr-MA')}
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

function Column({ statut, aos }: { statut: AOStatut; aos: AppelOffre[] }) {
  const cfg = STATUT_CONFIG[statut]
  return (
    <div className="flex-shrink-0 w-60 flex flex-col">
      <div className={clsx('flex items-center justify-between px-3 py-2 rounded-t-lg', cfg.bg)}>
        <span className={clsx('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
        <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full bg-white', cfg.color)}>{aos.length}</span>
      </div>
      <SortableContext items={aos.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-[100px]">
          {aos.map(ao => (
            <SortableCard key={ao.id} ao={ao} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Pipeline() {
  const queryClient = useQueryClient()
  const [activeAO, setActiveAO] = useState<AppelOffre | null>(null)
  const [search, setSearch] = useState('')

  const { data: aos = [] } = useQuery<AppelOffre[]>({
    queryKey: ['aos'],
    queryFn: () => aoApi.list(),
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

  const filtered = search
    ? aos.filter(a =>
        (a.objet || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.maitre_ouvrage?.nom || '').toLowerCase().includes(search.toLowerCase())
      )
    : aos

  const byStatut = (s: AOStatut) => filtered.filter(a => a.statut === s)

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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Pipeline AO</h1>
        <input
          className="input w-64 text-sm"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-sm text-gray-500 ml-auto">{aos.length} appel(s) d'offres</span>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(s => (
              <Column key={s} statut={s} aos={byStatut(s)} />
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
