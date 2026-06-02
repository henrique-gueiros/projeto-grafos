import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NbaGraph from './pages/NbaGraph.jsx'
import NbaDashboard from './pages/NbaDashboard.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Parte 1 — Rede de Aeroportos */}
        <Route path="/parte1" element={<Home />} />
        <Route path="/parte1/dashboard" element={<Dashboard />} />

        {/* Parte 2 — Rede de Assistências NBA */}
        <Route path="/parte2" element={<NbaGraph />} />
        <Route path="/parte2/dashboard" element={<NbaDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
