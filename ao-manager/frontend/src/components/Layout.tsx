import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { useQuery } from '@tanstack/react-query'
import { societeApi } from '../lib/api'
import type { Societe } from '../types'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)

  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: societeApi.list,
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-in when navOpen */}
      <div className={[
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:relative md:translate-x-0 md:flex md:flex-shrink-0',
        navOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <Navigation onClose={() => setNavOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={() => setNavOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">Sociétés actives :</span>
          <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
            {societes.map((s, i) => {
              const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-600', 'bg-rose-600']
              const color = colors[i % colors.length]
              return (
                <span key={s.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white flex-shrink-0 ${color}`}>
                  {s.code}
                </span>
              )
            })}
            {societes.length === 0 && (
              <span className="text-xs text-gray-400 italic truncate">Aucune société — Configurer dans Référentiel</span>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-3 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
