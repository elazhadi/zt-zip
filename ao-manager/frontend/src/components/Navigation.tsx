import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, Kanban, BarChart2, Archive, Settings, Trophy, X } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/analyse', icon: Search, label: 'Analyse DAO' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/intelligence', icon: BarChart2, label: 'Intelligence' },
  { to: '/resultats', icon: Trophy, label: 'Résultats AO' },
  { to: '/referentiel', icon: Archive, label: 'Référentiel' },
  { to: '/parametres', icon: Settings, label: 'Paramètres' },
]

interface Props {
  onClose?: () => void
}

export default function Navigation({ onClose }: Props) {
  return (
    <nav className="w-56 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AO</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">AO Manager</p>
            <p className="text-xs text-gray-500 mt-0.5">Marchés Publics MA</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <ul className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => (
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

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">v3.0 — Décret 2-22-431</p>
      </div>
    </nav>
  )
}
