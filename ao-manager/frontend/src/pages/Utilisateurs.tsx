import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Users, Plus, Edit2, Trash2, X, Check, Shield, Key,
  ChevronDown, ChevronRight, UserCheck, UserX, Loader2, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────────────────────

const MODULES_DEF = [
  { key: 'pipeline',     label: 'Pipeline AO',           actions: ['consulter','creer','modifier','supprimer'] },
  { key: 'analyse',      label: 'Analyse DAO',            actions: ['consulter','creer'] },
  { key: 'reponses',     label: 'Réponses & Offres',      actions: ['consulter','creer','modifier','supprimer'] },
  { key: 'marches',      label: 'Suivi Marchés',          actions: ['consulter','creer','modifier','supprimer'] },
  { key: 'referentiel',  label: 'Référentiel Sociétés',   actions: ['consulter','creer','modifier','supprimer'] },
  { key: 'resultats',    label: 'Résultats AO',           actions: ['consulter','creer','modifier','supprimer'] },
  { key: 'intelligence', label: 'Intelligence',           actions: ['consulter'] },
  { key: 'parametres',   label: 'Paramètres',             actions: ['consulter','modifier'] },
  { key: 'utilisateurs', label: 'Gestion Utilisateurs',   actions: ['consulter','creer','modifier','supprimer'] },
]

const ACTION_LABELS: Record<string, string> = {
  consulter: 'Consulter',
  creer:     'Créer',
  modifier:  'Modifier',
  supprimer: 'Supprimer',
}
const ACTION_COLORS: Record<string, string> = {
  consulter: 'text-blue-600',
  creer:     'text-green-600',
  modifier:  'text-orange-600',
  supprimer: 'text-red-600',
}

const ROLES = [
  { key: 'admin',          label: 'Administrateur',   color: 'bg-red-100 text-red-700' },
  { key: 'gestionnaire',   label: 'Gestionnaire AO',  color: 'bg-purple-100 text-purple-700' },
  { key: 'soumissionnaire',label: 'Soumissionnaire',  color: 'bg-blue-100 text-blue-700' },
  { key: 'consultant',     label: 'Consultant',        color: 'bg-gray-100 text-gray-700' },
  { key: 'custom',         label: 'Personnalisé',      color: 'bg-yellow-100 text-yellow-700' },
]

const ROLE_COLOR = Object.fromEntries(ROLES.map(r => [r.key, r.color]))

// ── API ────────────────────────────────────────────────────────────────────────

const usersApi = {
  list: () => api.get('/users/').then(r => r.data),
  create: (d: any) => api.post('/users/', d).then(r => r.data),
  updatePermissions: (id: number, d: any) => api.put(`/users/${id}/permissions`, d).then(r => r.data),
  updateSocietes: (id: number, ids: number[] | null) => api.put(`/users/${id}/societes`, { societes_autorisees: ids }).then(r => r.data),
  toggleActive: (id: number, is_active: boolean) => api.put(`/users/${id}`, { is_active }).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, pwd: string) => api.put(`/users/${id}/reset-password`, { nouveau_mdp: pwd }).then(r => r.data),
  meta: () => api.get('/users/meta/roles').then(r => r.data),
}

// ── Permission matrix ──────────────────────────────────────────────────────────

function PermMatrix({
  permissions, onChange,
}: {
  permissions: Record<string, Record<string, boolean>>
  onChange: (p: Record<string, Record<string, boolean>>) => void
}) {
  const toggle = (mod: string, action: string) => {
    const cur = permissions?.[mod]?.[action] ?? false
    onChange({
      ...permissions,
      [mod]: { ...(permissions?.[mod] ?? {}), [action]: !cur },
    })
  }

  const allActions = ['consulter', 'creer', 'modifier', 'supprimer']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 w-44">Module</th>
            {allActions.map(a => (
              <th key={a} className={clsx('text-center px-3 py-2.5 text-xs font-semibold w-24', ACTION_COLORS[a])}>
                {ACTION_LABELS[a]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES_DEF.map((mod, i) => (
            <tr key={mod.key} className={clsx('border-b border-gray-100', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
              <td className="px-3 py-2.5">
                <span className="font-medium text-gray-800 text-xs">{mod.label}</span>
              </td>
              {allActions.map(action => {
                const available = mod.actions.includes(action)
                const checked = available && !!(permissions?.[mod.key]?.[action])
                return (
                  <td key={action} className="text-center px-3 py-2.5">
                    {available ? (
                      <button
                        onClick={() => toggle(mod.key, action)}
                        className={clsx(
                          'w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all',
                          checked
                            ? 'bg-primary-600 border-primary-600'
                            : 'bg-white border-gray-300 hover:border-primary-400'
                        )}
                      >
                        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                      </button>
                    ) : (
                      <span className="text-gray-200 text-lg">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Role preset buttons ────────────────────────────────────────────────────────

function RolePresets({
  current, presets, onApply,
}: {
  current: string
  presets: Record<string, any>
  onApply: (role: string, perms: any) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="text-xs font-medium text-gray-500 self-center">Rôle prédéfini :</span>
      {ROLES.filter(r => r.key !== 'custom').map(role => (
        <button
          key={role.key}
          onClick={() => onApply(role.key, presets[role.key])}
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
            current === role.key
              ? `${role.color} border-transparent ring-2 ring-offset-1 ring-primary-400`
              : `${role.color} border-transparent opacity-60 hover:opacity-100`
          )}
        >
          {role.label}
        </button>
      ))}
      {current === 'custom' && (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
          Personnalisé
        </span>
      )}
    </div>
  )
}

// ── User avatar ────────────────────────────────────────────────────────────────

function Avatar({ nom, prenom, size = 'md' }: { nom: string; prenom: string; size?: 'sm' | 'md' }) {
  const initials = `${(prenom || nom)[0] || '?'}${nom[0] || ''}`.toUpperCase().slice(0, 2)
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-teal-500']
  const color = colors[(nom.charCodeAt(0) + (prenom.charCodeAt(0) || 0)) % colors.length]
  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
      size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm',
      color
    )}>
      {initials}
    </div>
  )
}

// ── Create user modal ──────────────────────────────────────────────────────────

function CreateUserModal({ presets, onClose }: { presets: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role_predefini: 'gestionnaire' })
  const [permissions, setPermissions] = useState<any>(presets?.gestionnaire ?? {})
  const [tab, setTab] = useState<'info' | 'perms'>('info')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const createMut = useMutation({
    mutationFn: () => usersApi.create({ ...form, permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur créé')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const applyPreset = (role: string, perms: any) => {
    set('role_predefini', role)
    setPermissions(perms)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Plus size={18} className="text-primary-600" /> Nouvel utilisateur
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['info', 'perms'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}>
              {t === 'info' ? 'Informations' : 'Permissions'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: 'prenom', l: 'Prénom' },
                { k: 'nom',    l: 'Nom *' },
                { k: 'email',  l: 'Email *' },
                { k: 'password', l: 'Mot de passe *' },
              ].map(({ k, l }) => (
                <div key={k}>
                  <label className="label text-xs">{l}</label>
                  <input
                    className="input"
                    type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                    value={(form as any)[k]}
                    onChange={e => set(k, e.target.value)}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="label text-xs">Rôle prédéfini</label>
                <select className="input" value={form.role_predefini}
                  onChange={e => applyPreset(e.target.value, presets?.[e.target.value])}>
                  {ROLES.filter(r => r.key !== 'custom').map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'perms' && (
            <>
              <RolePresets current={form.role_predefini} presets={presets} onApply={applyPreset} />
              <PermMatrix permissions={permissions} onChange={p => { setPermissions(p); set('role_predefini', 'custom') }} />
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            className="btn btn-primary"
            onClick={() => createMut.mutate()}
            disabled={!form.nom || !form.email || !form.password || createMut.isPending}
          >
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Créer l'utilisateur
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ── Sociétés access selector ───────────────────────────────────────────────────

function SocietesAccess({
  societes, value, onChange,
}: {
  societes: { id: number; code: string; nom: string }[]
  value: number[] | null
  onChange: (v: number[] | null) => void
}) {
  const allAccess = value === null

  const toggle = (id: number) => {
    if (allAccess) {
      // switching from all to restricted — exclude this one
      onChange(societes.filter(s => s.id !== id).map(s => s.id))
    } else {
      const next = value!.includes(id) ? value!.filter(x => x !== id) : [...value!, id]
      onChange(next.length === societes.length ? null : next)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(null)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            allAccess
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
          )}
        >
          Toutes les sociétés
        </button>
        <button
          onClick={() => onChange([])}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            !allAccess && value?.length === 0
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
          )}
        >
          Aucune société
        </button>
      </div>
      {societes.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Aucune société dans le référentiel</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {societes.map(s => {
            const checked = allAccess || (value ?? []).includes(s.id)
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all',
                  checked
                    ? 'bg-primary-50 border-primary-300 text-primary-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                  checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                )}>
                  {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium truncate">{s.code}</span>
                <span className="text-xs text-gray-400 truncate flex-1">{s.nom}</span>
              </button>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400">
        {allAccess
          ? 'Accès à toutes les sociétés du référentiel'
          : `${value?.length ?? 0} société(s) autorisée(s)`}
      </p>
    </div>
  )
}

// ── Edit permissions panel ─────────────────────────────────────────────────────

function EditPermPanel({
  user, presets, societes, onClose,
}: {
  user: any; presets: any; societes: any[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const [permissions, setPermissions] = useState<any>(user.permissions || {})
  const [role, setRole] = useState(user.role_predefini)
  const [showReset, setShowReset] = useState(false)
  const [showSocietes, setShowSocietes] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [societeAccess, setSocieteAccess] = useState<number[] | null>(
    user.societes_autorisees ?? null
  )

  const saveMut = useMutation({
    mutationFn: () => usersApi.updatePermissions(user.id, { permissions, role_predefini: role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Permissions enregistrées'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const saveSocietesMut = useMutation({
    mutationFn: () => usersApi.updateSocietes(user.id, societeAccess),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Accès sociétés mis à jour') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const resetPwdMut = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id, newPwd),
    onSuccess: () => { toast.success('Mot de passe réinitialisé'); setShowReset(false); setNewPwd('') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const applyPreset = (r: string, perms: any) => {
    setRole(r)
    setPermissions(perms || {})
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar nom={user.nom} prenom={user.prenom} />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{user.prenom} {user.nom}</h2>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="p-5">
          <RolePresets current={role} presets={presets} onApply={applyPreset} />
          <PermMatrix
            permissions={permissions}
            onChange={p => { setPermissions(p); setRole('custom') }}
          />
        </div>

        {/* Sociétés access section */}
        <div className="mx-5 mb-3 p-4 border border-gray-200 rounded-xl">
          <button
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-full"
            onClick={() => setShowSocietes(v => !v)}
          >
            <Building2 size={15} />
            Accès aux sociétés
            <span className="ml-2 text-xs text-gray-400">
              {societeAccess === null ? '(toutes)' : `(${societeAccess.length} sélectionnée(s))`}
            </span>
            {showSocietes ? <ChevronDown size={15} className="ml-auto" /> : <ChevronRight size={15} className="ml-auto" />}
          </button>
          {showSocietes && (
            <div className="mt-3 space-y-3">
              <SocietesAccess societes={societes} value={societeAccess} onChange={setSocieteAccess} />
              <button
                className="btn btn-secondary text-xs"
                onClick={() => saveSocietesMut.mutate()}
                disabled={saveSocietesMut.isPending}
              >
                {saveSocietesMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Enregistrer l'accès sociétés
              </button>
            </div>
          )}
        </div>

        {/* Reset password section */}
        <div className="mx-5 mb-5 p-4 border border-gray-200 rounded-xl">
          <button
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-full"
            onClick={() => setShowReset(v => !v)}
          >
            <Key size={15} />
            Réinitialiser le mot de passe
            {showReset ? <ChevronDown size={15} className="ml-auto" /> : <ChevronRight size={15} className="ml-auto" />}
          </button>
          {showReset && (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                className="input flex-1 text-sm"
                placeholder="Nouveau mot de passe (min. 6 car.)"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
              />
              <button
                className="btn btn-primary text-sm"
                onClick={() => resetPwdMut.mutate()}
                disabled={newPwd.length < 6 || resetPwdMut.isPending}
              >
                {resetPwdMut.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Valider'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            className="btn btn-primary"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Enregistrer les permissions
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Utilisateurs() {
  const { user: me, can } = useAuth()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: meta } = useQuery({ queryKey: ['users-meta'], queryFn: usersApi.meta })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      usersApi.toggleActive(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const canCreate = can('utilisateurs', 'creer')
  const canEdit   = can('utilisateurs', 'modifier')
  const canDelete = can('utilisateurs', 'supprimer')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={22} className="text-primary-600" />
          Gestion des utilisateurs
        </h1>
        {canCreate && (
          <button className="btn btn-primary text-sm" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Nouvel utilisateur
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',   value: users.length,                               color: 'text-gray-800' },
          { label: 'Actifs',  value: users.filter((u:any) => u.is_active).length, color: 'text-green-700' },
          { label: 'Admins',  value: users.filter((u:any) => u.role_predefini === 'admin').length, color: 'text-red-700' },
          { label: 'Inactifs',value: users.filter((u:any) => !u.is_active).length, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center py-3">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary-600" size={28} />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Dernière connexion</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nom={u.nom} prenom={u.prenom} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {u.prenom} {u.nom}
                            {u.is_super_admin && (
                              <Shield size={12} className="inline ml-1 text-red-500" title="Super Admin" />
                            )}
                            {u.id === me?.id && (
                              <span className="ml-1 text-xs text-primary-600">(moi)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-xs', ROLE_COLOR[u.role_predefini] || 'bg-gray-100 text-gray-600')}>
                        {u.role_label}
                      </span>
                      {u.societes_autorisees !== null && (
                        <span className="ml-1 badge text-xs bg-amber-100 text-amber-700" title="Accès restreint aux sociétés">
                          {u.societes_autorisees.length} sté
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"></span> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric' })
                        : 'Jamais'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <>
                            <button
                              title="Modifier les permissions"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                              onClick={() => setEditUser(u)}
                            >
                              <Edit2 size={15} />
                            </button>
                            {u.id !== me?.id && !u.is_super_admin && (
                              <button
                                title={u.is_active ? 'Désactiver' : 'Activer'}
                                className={clsx(
                                  'p-1.5 rounded-lg',
                                  u.is_active
                                    ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                )}
                                onClick={() => toggleMut.mutate({ id: u.id, is_active: !u.is_active })}
                              >
                                {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                            )}
                          </>
                        )}
                        {canDelete && u.id !== me?.id && !u.is_super_admin && (
                          <button
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) deleteMut.mutate(u.id)
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Légende des actions */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="font-medium">Actions :</span>
        {Object.entries(ACTION_LABELS).map(([k, v]) => (
          <span key={k} className={clsx('font-medium', ACTION_COLORS[k])}>● {v}</span>
        ))}
      </div>

      {showCreate && meta && (
        <CreateUserModal presets={meta.presets} onClose={() => setShowCreate(false)} />
      )}
      {editUser && meta && (
        <EditPermPanel
          user={editUser}
          presets={meta.presets}
          societes={meta.societes ?? []}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  )
}
