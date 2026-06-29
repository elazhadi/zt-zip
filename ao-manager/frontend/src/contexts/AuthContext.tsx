import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

export interface UserPerms {
  [module: string]: { [action: string]: boolean }
}

export interface AuthUser {
  id: number
  nom: string
  prenom: string
  email: string
  role_predefini: string
  role_label: string
  permissions: UserPerms
  is_super_admin: boolean
  societes_autorisees: number[] | null
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  can: (module: string, action: string) => boolean
  canAccessSociete: (id: number) => boolean
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ao_token'))
  const [loading, setLoading] = useState(true)

  // Inject token into all requests
  useEffect(() => {
    const id = api.interceptors.request.use(cfg => {
      const t = localStorage.getItem('ao_token')
      if (t) cfg.headers.Authorization = `Bearer ${t}`
      return cfg
    })
    return () => api.interceptors.request.eject(id)
  }, [])

  // Load user on mount if token exists
  useEffect(() => {
    const t = localStorage.getItem('ao_token')
    if (!t) { setLoading(false); return }
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => { localStorage.removeItem('ao_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password })
    const { access_token, user: u } = r.data
    localStorage.setItem('ao_token', access_token)
    setToken(access_token)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('ao_token')
    setToken(null)
    setUser(null)
  }

  const can = (module: string, action: string): boolean => {
    if (!user) return false
    if (user.is_super_admin) return true
    return !!user.permissions?.[module]?.[action]
  }

  const canAccessSociete = (id: number): boolean => {
    if (!user) return false
    if (user.is_super_admin || user.societes_autorisees === null) return true
    return (user.societes_autorisees ?? []).includes(id)
  }

  return (
    <Ctx.Provider value={{ user, token, loading, login, logout, can, canAccessSociete }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
