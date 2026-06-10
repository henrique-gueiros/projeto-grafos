import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGraphData, runAlgorithm, getCaminhosObrigatorios,
} from '../api.js'
import GraphViewer, { REGION_HEX, CONN_COLORS } from '../components/GraphViewer.jsx'
import AirportSidebar from '../components/AirportSidebar.jsx'

const REGIONS = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']
const TIPOS = ['regional', 'hub', 'hub-hub']
const TIPO_LABELS = { regional: 'Regional', hub: 'Hub', 'hub-hub': 'Hub-Hub' }

const ALGO_ACCENT = { BFS: '#3b82f6', DFS: '#6366f1', DIJKSTRA: '#f59e0b' }

function buildAnimation(result) {
  const accent = ALGO_ACCENT[result.algorithm] ?? '#f59e0b'
  if (result.algorithm === 'BFS') {
    const order = result.ordem_visita ?? []
    const pred = result.predecessores ?? {}
    const edges = []
    order.forEach((n) => { const p = pred[n]; if (p != null) edges.push([p, n]) })
    return { startNode: result.source ?? order[0], edges, accent }
  }
  if (result.algorithm === 'DFS') {
    return { startNode: result.source, edges: result.arestas_arvore ?? [], accent }
  }
  if (result.algorithm === 'DIJKSTRA' && result.caminho) {
    const c = result.caminho
    const edges = []
    for (let i = 0; i < c.length - 1; i++) edges.push([c[i], c[i + 1]])
    return { startNode: c[0], edges, accent }
  }
  return null
}

function Toast({ msg, type, onClose }) {
  const cls = {
    success: 'bg-emerald-800 border-emerald-600',
    error: 'bg-red-900 border-red-700',
  }[type] ?? 'bg-slate-800 border-slate-600'
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm max-w-xs ${cls}`}>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-base leading-none">x</button>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function PathBtn({ label, path, active, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!path?.nodes?.length}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 4,
        background: active ? 'rgba(245,197,66,0.08)' : 'rgba(0,0,0,0.2)',
        border: active ? '1px solid rgba(245,197,66,0.3)' : '1px solid rgba(255,255,255,0.05)',
        fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 11,
        cursor: path?.nodes?.length ? 'pointer' : 'not-allowed',
        opacity: path?.nodes?.length ? 1 : 0.4,
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? '#f5c542' : 'rgba(245,197,66,0.2)',
        boxShadow: active ? '0 0 6px #f5c542, 0 0 12px rgba(245,197,66,0.4)' : 'none',
      }} />
      <span style={{ flex: 1, textAlign: 'left', color: active ? '#c8a030' : '#3a5060' }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, padding: '1px 4px', borderRadius: 2,
        border: active ? '1px solid rgba(245,197,66,0.2)' : '1px solid rgba(255,255,255,0.04)',
        color: active ? '#6a5010' : '#1a2a30',
      }}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

const ALGO_FONT = { fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }

function AlgoResult({ result }) {
  if (!result) return null
  const alg = result.algorithm
  if (alg === 'DIJKSTRA') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-sm space-y-1" style={ALGO_FONT}>
      <p className="text-slate-400">Custo: <span className="text-amber-400">{result.custo ?? 'sem caminho'}</span></p>
      <p className="text-slate-400 break-all">
        Caminho: <span className="text-slate-200">{result.caminho?.join(' - ') ?? 'sem caminho'}</span>
      </p>
    </div>
  )
  if (alg === 'BFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-sm space-y-1" style={ALGO_FONT}>
      <p className="text-slate-400">Visitados: <span className="text-blue-400">{result.ordem_visita?.length}</span></p>
      <p className="text-slate-400">Camadas: <span className="text-blue-400">{result.camadas?.length}</span></p>
      <div className="max-h-24 overflow-y-auto space-y-0.5 text-slate-500">
        {result.camadas?.map((l, i) => (
          <p key={i}><span className="text-slate-600">L{i}:</span> {l.join(', ')}</p>
        ))}
      </div>
    </div>
  )
  if (alg === 'DFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-sm space-y-1" style={ALGO_FONT}>
      <p className="text-slate-400">Visitados: <span className="text-indigo-400">{result.ordem_visita?.length}</span></p>
      <p className="text-slate-400">
        Ciclo: <span className={result.tem_ciclo ? 'text-red-400' : 'text-emerald-400'}>
          {result.tem_ciclo ? 'detectado' : 'nao'}
        </span>
      </p>
      <p className="text-slate-400">arvore: {result.arestas_arvore?.length} | retorno: {result.arestas_retorno?.length}</p>
    </div>
  )
  return null
}

export default function Home() {
  const navigate = useNavigate()
  const graphRef = useRef(null)

  const [graphData, setGraphData] = useState(null)
  const [mandatoryPaths, setMandatoryPaths] = useState(null)

  const [filters, setFilters] = useState({ regioes: [], tipos: [] })
  const [pathHighlights, setPathHighlights] = useState({ path1: false, path2: false })
  const [regionEdgeHL, setRegionEdgeHL] = useState({})
  const [physicsOn, setPhysicsOn] = useState(true)

  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [activeAlg, setActiveAlg] = useState(null)
  const [algoResult, setAlgoResult] = useState(null)
  const [animation, setAnimation] = useState(null)

  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('flight')

  const [selectedIata, setSelectedIata] = useState(null)
  const selectedNode = useMemo(
    () => graphData?.nodes?.find((n) => n.id === selectedIata) ?? null,
    [graphData, selectedIata],
  )

  const handleNodeClick    = useCallback((iata) => setSelectedIata(iata), [])
  const handleNodeDeselect = useCallback(() => setSelectedIata(null), [])
  const closeSidebar       = useCallback(() => {
    setSelectedIata(null)
    graphRef.current?.deselect()
  }, [])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const withLoading = useCallback(async (key, fn) => {
    setLoading((l) => ({ ...l, [key]: true }))
    try { return await fn() }
    finally { setLoading((l) => ({ ...l, [key]: false })) }
  }, [])

  const loadGraph = useCallback(async () => {
    try { setGraphData(await getGraphData()) } catch {  }
  }, [])

  const loadPaths = useCallback(async () => {
    try { setMandatoryPaths(await getCaminhosObrigatorios()) } catch {  }
  }, [])

  useEffect(() => {
    loadGraph()
    loadPaths()
  }, []) 

  const toggleFilter = (key, val) =>
    setFilters((f) => {
      const arr = f[key]
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] }
    })

  const clearFilters = () => setFilters({ regioes: [], tipos: [] })

  const togglePath = (id) => setPathHighlights((p) => ({ ...p, [id]: !p[id] }))

  const toggleRegionHL = (r) => setRegionEdgeHL((h) => ({ ...h, [r]: !h[r] }))

  const clearHighlights = () => {
    setPathHighlights({ path1: false, path2: false })
    setRegionEdgeHL({})
  }

  const clearAll = () => {
    clearFilters()
    clearHighlights()
    setAnimation(null)
    setActiveAlg(null)
    setAlgoResult(null)
  }

  const hasHighlight =
    pathHighlights.path1 || pathHighlights.path2 || Object.values(regionEdgeHL).some(Boolean)
  const hasFilter = filters.regioes.length > 0 || filters.tipos.length > 0

  const NEEDS_TARGET = ['DIJKSTRA']

  const runAlgo = async (algName) => {
    if (!source.trim()) { showToast('Informe o aeroporto de origem.', 'error'); return }
    if (NEEDS_TARGET.includes(algName) && !target.trim()) {
      showToast('Dijkstra precisa de um aeroporto de destino.', 'error'); return
    }
    setActiveAlg(algName)
    try {
      const result = await withLoading(algName, () =>
        runAlgorithm({
          algorithm: algName,
          source: source.trim().toUpperCase(),
          target: NEEDS_TARGET.includes(algName) ? target.trim().toUpperCase() : undefined,
        }),
      )
      setAlgoResult(result)
      setAnimation(buildAnimation(result))
    } catch (e) { showToast(e.message, 'error') }
  }

  const clearAlgo = () => {
    setAnimation(null); setActiveAlg(null); setAlgoResult(null)
  }

  const airports = useMemo(() => graphData?.nodes?.map((n) => n.id).sort() ?? [], [graphData])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">

      <header
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: '#030710', borderBottom: '1px solid rgba(0,150,255,0.12)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 14,
            color: '#7edcff', letterSpacing: '3px',
          }}>
            REDE DE AEROPORTOS — BR
          </span>
          <span style={{
            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, color: '#1a3a50',
            letterSpacing: '2px', border: '1px solid rgba(0,150,255,0.15)',
            borderRadius: 2, padding: '1px 5px', display: 'inline-block', width: 'fit-content',
          }}>
            PARTE 1
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => navigate('/')}
            style={{
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
              padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid rgba(0,180,255,0.25)', color: '#2a5070', background: 'transparent',
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            INÍCIO
          </button>
          <button
            onClick={() => navigate('/parte1/dashboard')}
            style={{
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
              padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid rgba(0,180,255,0.4)', color: '#7edcff', background: 'rgba(0,180,255,0.08)',
              transition: 'all 0.15s',
            }}
          >
            DASHBOARD
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <AirportSidebar
          iata={selectedIata}
          node={selectedNode}
          onClose={closeSidebar}
        />

        <main className="flex-1 relative overflow-hidden">
          <GraphViewer
            ref={graphRef}
            data={graphData}
            filters={filters}
            pathHighlights={pathHighlights}
            regionEdgeHL={regionEdgeHL}
            mandatoryPaths={mandatoryPaths}
            animation={animation}
            physicsOn={physicsOn}
            onStabilized={() => setPhysicsOn(false)}
            onNodeClick={handleNodeClick}
            onNodeDeselect={handleNodeDeselect}
          />

          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <button
              onClick={() => graphRef.current?.fit()}
              style={{
                fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
                padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
                border: '1px solid rgba(0,180,255,0.25)', color: '#2a5070',
                background: 'rgba(3,6,16,0.85)', transition: 'all 0.15s',
              }}
            >
              CENTRALIZAR
            </button>
            <button
              onClick={() => setPhysicsOn((p) => !p)}
              style={{
                fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
                padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
                border: physicsOn ? '1px solid rgba(245,197,66,0.4)' : '1px solid rgba(0,180,255,0.25)',
                color: physicsOn ? '#f5c542' : '#2a5070',
                background: physicsOn ? 'rgba(245,197,66,0.08)' : 'rgba(3,6,16,0.85)',
                transition: 'all 0.15s',
              }}
            >
              {physicsOn ? 'PAUSAR' : 'FÍSICA'}
            </button>
          </div>
        </main>

        <aside
          className="w-80 shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#060d1c', borderLeft: '1px solid rgba(0,150,255,0.15)' }}
        >
          {}
          <div className="cockpit-tab-bar">
            <button
              className={`cockpit-tab ${activeTab === 'flight' ? 'active' : ''}`}
              onClick={() => setActiveTab('flight')}
            >
              FLIGHT
            </button>
            <button
              className={`cockpit-tab ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              FILTERS
            </button>
          </div>

          {}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'flight' ? (
              <div>
                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Algorithms</span>

                  <div className="space-y-1.5 mb-3">
                    <div className="relative">
                      <span style={{ position: 'absolute', left: 9, top: 7, fontSize: 11, color: '#1a4060', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>▶</span>
                      <input
                        type="text"
                        placeholder="Origem (ex: REC)"
                        value={source}
                        onChange={(e) => setSource(e.target.value.toUpperCase())}
                        list="airports-list"
                        className="neon-input"
                      />
                    </div>
                    <div className="relative">
                      <span style={{ position: 'absolute', left: 9, top: 7, fontSize: 11, color: '#0a2040', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>▶</span>
                      <input
                        type="text"
                        placeholder="Destino — Dijkstra (ex: POA)"
                        value={target}
                        onChange={(e) => setTarget(e.target.value.toUpperCase())}
                        list="airports-list"
                        className="neon-input"
                      />
                    </div>
                    <datalist id="airports-list">
                      {airports.map((a) => <option key={a} value={a} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { id: 'BFS',      label: 'BFS',      cls: 'neon-btn-blue'   },
                      { id: 'DFS',      label: 'DFS',      cls: 'neon-btn-purple' },
                      { id: 'DIJKSTRA', label: 'DIJKSTRA', cls: 'neon-btn-gold'   },
                    ].map((a) => (
                      <button
                        key={a.id}
                        onClick={() => runAlgo(a.id)}
                        disabled={!graphData || loading[a.id]}
                        className={`neon-btn ${activeAlg === a.id ? a.cls : a.cls} disabled:opacity-40`}
                      >
                        {loading[a.id] ? <Spinner /> : a.label}
                      </button>
                    ))}
                    <button
                      disabled
                      title="Bellman-Ford não se aplica aqui: grafo não-dirigido com pesos não-negativos. Veja a demonstração na Parte 2."
                      className="neon-btn neon-btn-dim"
                    >
                      BELLMAN
                    </button>
                  </div>

                  {algoResult && (
                    <div style={{
                      background: 'rgba(0,50,100,0.15)',
                      border: '1px solid rgba(0,150,255,0.12)',
                      borderRadius: 4, padding: '6px 8px',
                      fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10,
                    }}>
                      <span className="cockpit-label" style={{ marginBottom: 4 }}>Resultado</span>
                      <AlgoResult result={algoResult} />
                    </div>
                  )}
                  {algoResult && (
                    <button onClick={clearAlgo} className="neon-btn neon-btn-blue w-full mt-2" style={{ letterSpacing: 1 }}>
                      Limpar resultado
                    </button>
                  )}
                </div>

                {}
                <div className="p-3">
                  <span className="cockpit-label">Caminhos Obrigatórios</span>
                  <div className="space-y-1.5">
                    <PathBtn
                      label="Recife — Porto Alegre"
                      path={mandatoryPaths?.path1}
                      active={pathHighlights.path1}
                      onClick={() => togglePath('path1')}
                    />
                    <PathBtn
                      label="Manaus — São Paulo"
                      path={mandatoryPaths?.path2}
                      active={pathHighlights.path2}
                      onClick={() => togglePath('path2')}
                    />
                  </div>
                  {!mandatoryPaths && (
                    <p style={{ fontSize: 11, color: '#1a3a50', marginTop: 6, fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>
                      Execute as métricas para calcular os caminhos.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Região</span>
                  <div className="space-y-1.5">
                    {REGIONS.map((r) => {
                      const active = filters.regioes.includes(r)
                      const color = REGION_HEX[r]
                      return (
                        <button
                          key={r}
                          onClick={() => toggleFilter('regioes', r)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                            padding: '5px 8px', borderRadius: 3,
                            background: active ? `${color}1e` : 'transparent',
                            border: active ? `1px solid ${color}55` : `1px solid ${color}1e`,
                            cursor: 'pointer', transition: 'all 0.15s',
                            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 11, letterSpacing: '1px',
                          }}
                        >
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                            background: active ? color : `${color}4d`,
                          }} />
                          <span style={{ flex: 1, textAlign: 'left', color: active ? color : '#3a4050' }}>
                            {r.toUpperCase().replace('-', ' ')}
                          </span>
                          <span style={{
                            width: 20, height: 10, borderRadius: 5, position: 'relative', flexShrink: 0,
                            background: active ? color : '#0d1828',
                            border: active ? 'none' : '1px solid #1a2a3a',
                            transition: 'background 0.15s',
                          }}>
                            <span style={{
                              position: 'absolute', top: 1, borderRadius: '50%',
                              width: 8, height: 8, background: active ? 'white' : '#1a2a3a',
                              left: active ? 11 : 1,
                              transition: 'left 0.15s',
                            }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Tipo de Ligação</span>
                  <div className="flex gap-1.5">
                    {TIPOS.map((t) => {
                      const active = filters.tipos.includes(t)
                      const color = CONN_COLORS[t]
                      return (
                        <button
                          key={t}
                          onClick={() => toggleFilter('tipos', t)}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: 3, textAlign: 'center',
                            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: active ? `${color}1e` : 'transparent',
                            border: active ? `1px solid ${color}55` : `1px solid rgba(255,255,255,0.05)`,
                            color: active ? color : '#1a2a35',
                          }}
                        >
                          {TIPO_LABELS[t].toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {}
                {graphData && (
                  <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                    <span className="cockpit-label">Conexões Internas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {REGIONS.map((r) => {
                        const active = !!regionEdgeHL[r]
                        const color = REGION_HEX[r]
                        return (
                          <button
                            key={r}
                            onClick={() => toggleRegionHL(r)}
                            style={{
                              padding: '4px 8px', borderRadius: 3,
                              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '1px',
                              cursor: 'pointer', transition: 'all 0.15s',
                              background: active ? `${color}1e` : 'transparent',
                              border: active ? `1px solid ${color}44` : `1px solid rgba(255,255,255,0.05)`,
                              color: active ? color : '#1a2a35',
                            }}
                          >
                            {r.split('-')[0].toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {}
                {(hasFilter || hasHighlight || algoResult) && (
                  <div className="p-3 space-y-1.5">
                    {hasHighlight && (
                      <button
                        onClick={clearHighlights}
                        className="neon-btn neon-btn-blue w-full"
                        style={{ letterSpacing: 1 }}
                      >
                        Limpar Destaques
                      </button>
                    )}
                    <button
                      onClick={clearAll}
                      style={{
                        width: '100%', padding: '6px', borderRadius: 3, textAlign: 'center',
                        fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, letterSpacing: '2px',
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: '1px solid rgba(255,50,50,0.2)', color: '#3a1a1a',
                        background: 'transparent',
                      }}
                    >
                      LIMPAR TUDO
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {}
          <div style={{
            padding: '7px 12px', flexShrink: 0,
            background: 'rgba(2,5,12,0.9)',
            borderTop: '1px solid rgba(0,150,255,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 11, letterSpacing: '1px',
          }}>
            <span style={{ color: '#1a3a50' }}>SIS. ATIVO</span>
            <span style={{ color: '#0a6040' }}>● ONLINE</span>
          </div>
        </aside>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
