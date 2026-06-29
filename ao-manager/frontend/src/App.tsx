import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AnalyseDAO from './pages/AnalyseDAO'
import FicheAO from './pages/FicheAO'
import Pipeline from './pages/Pipeline'
import Intelligence from './pages/Intelligence'
import Referentiel from './pages/Referentiel'
import SocieteDetail from './pages/SocieteDetail'
import Parametres from './pages/Parametres'
import MarcheDetail from './pages/MarcheDetail'
import Resultats from './pages/Resultats'
import Utilisateurs from './pages/Utilisateurs'
import ImportHistorique from './pages/ImportHistorique'
import { Loader2 } from 'lucide-react'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/pipeline" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analyse" element={<AnalyseDAO />} />
        <Route path="ao/:id" element={<FicheAO />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="intelligence" element={<Intelligence />} />
        <Route path="referentiel" element={<Referentiel />} />
        <Route path="referentiel/:id" element={<SocieteDetail />} />
        <Route path="marche/:id" element={<MarcheDetail />} />
        <Route path="resultats" element={<Resultats />} />
        <Route path="parametres" element={<Parametres />} />
        <Route path="utilisateurs" element={<Utilisateurs />} />
        <Route path="import-historique" element={<ImportHistorique />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
