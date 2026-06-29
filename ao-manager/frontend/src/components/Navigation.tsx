import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, Kanban, BarChart2, Archive,
  Settings, Trophy, X, Users, LogOut, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord', module: 'pipeline' },
  { to: '/analyse',      icon: Search,          label: 'Analyse DAO',     module: 'analyse' },
  { to: '/pipeline',     icon: Kanban,          label: 'Pipeline',        module: 'pipeline' },
  { to: '/intelligence', icon: BarChart2,       label: 'Intelligence',    module: 'intelligence' },
  { to: '/resultats',    icon: Trophy,          label: 'Résultats AO',    module: 'resultats' },
  { to: '/referentiel',  icon: Archive,         label: 'Référentiel',     module: 'referentiel' },
  { to: '/parametres',   icon: Settings,        label: 'Paramètres',      module: 'parametres' },
  { to: '/utilisateurs', icon: Users,           label: 'Utilisateurs',    module: 'utilisateurs' },
]

interface Props {
  onClose?: () => void
}

export default function Navigation({ onClose }: Props) {
  const { user, logout, can } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => can(item.module, 'consulter'))

  const initials = user
    ? `${(user.prenom || user.nom)[0] || '?'}${user.nom[0] || ''}`.toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="w-56 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AO</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">AO Manager</p>
            <p className="text-xs text-gray-500 mt-0.5">Marchés Publics MA</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <ul className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* User info + logout */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        <div className="relative">
          <button
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
            onClick={() => setShowUserMenu(v => !v)}
          >
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.role_label}</p>
            </div>
            <ChevronDown size={14} className={clsx('text-gray-400 transition-transform flex-shrink-0', showUserMenu && 'rotate-180')} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-800">{user?.email}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => { setShowUserMenu(false); logout() }}
              >
                <LogOut size={15} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">v3.0 — Décret 2-22-431</p>
      </div>
    </nav>
  )
}
