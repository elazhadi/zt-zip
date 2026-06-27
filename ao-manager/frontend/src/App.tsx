import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AnalyseDAO from './pages/AnalyseDAO'
import FicheAO from './pages/FicheAO'
import Pipeline from './pages/Pipeline'
import Intelligence from './pages/Intelligence'
import Referentiel from './pages/Referentiel'
import SocieteDetail from './pages/SocieteDetail'
import Parametres from './pages/Parametres'
import MarcheDetail from './pages/MarcheDetail'

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="parametres" element={<Parametres />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
