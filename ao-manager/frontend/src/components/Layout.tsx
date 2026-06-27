import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { useQuery } from '@tanstack/react-query'
import { societeApi } from '../lib/api'
import type { Societe } from '../types'

export default function Layout() {
  const { data: societes = [] } = useQuery<Societe[]>({
    queryKey: ['societes'],
    queryFn: societeApi.list,
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — sociétés badges */}
        <header className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 font-medium">Sociétés actives :</span>
          {societes.map((s, i) => {
            const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-600', 'bg-rose-600']
            const color = colors[i % colors.length]
            return (
              <span key={s.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${color}`}>
                {s.code}
              </span>
            )
          })}
          {societes.length === 0 && (
            <span className="text-xs text-gray-400 italic">Aucune société — Configurer dans Référentiel</span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
