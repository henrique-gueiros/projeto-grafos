import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGraphData, runAlgorithm, getCaminhosObrigatorios,
} from '../api.js'
import GraphViewer, { REGION_HEX, CONN_COLORS } from '../components/GraphViewer.jsx'

const REGIONS = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']
const TIPOS = ['regional', 'hub', 'hub-hub']
const TIPO_LABELS = { regional: 'Regional', hub: 'Hub', 'hub-hub': 'Hub-Hub' }

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


function Chip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all
        ${active
          ? 'border-transparent text-slate-900'
          : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-300'}`}
      style={active ? { background: color || '#3b82f6' } : {}}
    >
      {label}
    </button>
  )
}

function PathBtn({ label, path, active, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!path?.nodes?.length}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all
        ${active
          ? 'border-transparent text-slate-900 font-semibold'
          : 'border-slate-600 text-slate-300 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed'}`}
      style={active ? { background: path?.color ?? '#3b82f6' } : {}}
    >
      <span className="w-4 h-1.5 rounded-full shrink-0" style={{ background: path?.color ?? '#64748b' }} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}


function AlgoResult({ result }) {
  if (!result) return null
  const alg = result.algorithm
  if (alg === 'DIJKSTRA') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Custo: <span className="text-amber-400 font-bold">{result.custo ?? 'sem caminho'}</span></p>
      <p className="text-slate-400 break-all">
        Caminho: <span className="text-slate-200">{result.caminho?.join(' - ') ?? 'sem caminho'}</span>
      </p>
    </div>
  )
  if (alg === 'BFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Visitados: <span className="text-blue-400 font-bold">{result.ordem_visita?.length}</span></p>
      <p className="text-slate-400">Camadas: <span className="text-blue-400 font-bold">{result.camadas?.length}</span></p>
      <div className="max-h-24 overflow-y-auto space-y-0.5 text-slate-500">
        {result.camadas?.map((l, i) => (
          <p key={i}><span className="text-slate-600">L{i}:</span> {l.join(', ')}</p>
        ))}
      </div>
    </div>
  )
  if (alg === 'DFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Visitados: <span className="text-indigo-400 font-bold">{result.ordem_visita?.length}</span></p>
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

  const [alg, setAlg] = useState('DIJKSTRA')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [algoResult, setAlgoResult] = useState(null)
  const [algoPath, setAlgoPath] = useState([])
  const [bfsLayers, setBfsLayers] = useState(null)

  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState(null)

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
    try { setGraphData(await getGraphData()) } catch { /* not ready */ }
  }, [])

  const loadPaths = useCallback(async () => {
    try { setMandatoryPaths(await getCaminhosObrigatorios()) } catch { /* not computed */ }
  }, [])

  useEffect(() => {
    loadGraph()
    loadPaths()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setAlgoPath([])
    setBfsLayers(null)
    setAlgoResult(null)
  }

  const hasHighlight =
    pathHighlights.path1 || pathHighlights.path2 || Object.values(regionEdgeHL).some(Boolean)
  const hasFilter = filters.regioes.length > 0 || filters.tipos.length > 0

  const handleRunAlgo = async () => {
    if (!source.trim()) { showToast('Informe o aeroporto de origem.', 'error'); return }
    try {
      const result = await withLoading('algo', () =>
        runAlgorithm({
          algorithm: alg,
          source: source.trim().toUpperCase(),
          target: target.trim().toUpperCase() || undefined,
        }),
      )
      setAlgoResult(result)
      if (result.caminho) { setAlgoPath(result.caminho); setBfsLayers(null) }
      else if (result.camadas) { setBfsLayers(result.camadas); setAlgoPath([]) }
      else { setAlgoPath([]); setBfsLayers(null) }
    } catch (e) { showToast(e.message, 'error') }
  }

  const clearAlgo = () => { setAlgoPath([]); setBfsLayers(null); setAlgoResult(null) }

  const airports = useMemo(() => graphData?.nodes?.map((n) => n.id).sort() ?? [], [graphData])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">

      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100">Parte 1 — Rede de Aeroportos do Brasil</h1>
          <p className="text-xs text-slate-500">Projeto de Grafos</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => navigate('/')} className="btn-secondary text-xs">
            Início
          </button>
          <button onClick={() => navigate('/parte1/dashboard')} className="btn-primary text-xs">
            Dashboard
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <main className="flex-1 relative overflow-hidden">
          <GraphViewer
            ref={graphRef}
            data={graphData}
            filters={filters}
            pathHighlights={pathHighlights}
            regionEdgeHL={regionEdgeHL}
            mandatoryPaths={mandatoryPaths}
            algoPath={algoPath}
            bfsLayers={bfsLayers}
            physicsOn={physicsOn}
            onStabilized={() => setPhysicsOn(false)}
          />

          {graphData && (
            <div className="absolute top-3 right-3 flex gap-1.5 z-10">
              <button
                onClick={() => graphRef.current?.fit()}
                className="btn-secondary text-xs px-2.5 py-1.5 shadow-lg"
              >
                Centralizar
              </button>
              <button
                onClick={() => setPhysicsOn((p) => !p)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium shadow-lg transition-all
                  ${physicsOn
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'}`}
              >
                {physicsOn ? 'Pausar fisica' : 'Retomar fisica'}
              </button>
            </div>
          )}

          {graphData && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
              <span className="text-xs bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-400">
                {graphData.nodes.length} aeroportos · {graphData.edges.length} ligacoes
              </span>
              {Object.entries(REGION_HEX).map(([r, c]) => (
                <span key={r} className="flex items-center gap-1 text-xs bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-lg text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                  {r.split('-')[0]}
                </span>
              ))}
            </div>
          )}
        </main>

        <aside className="w-80 shrink-0 bg-slate-800/80 border-l border-slate-700 overflow-y-auto">
          <div className="p-3 space-y-4">

            <section>
              <p className="section-title">Algoritmo</p>
              <div className="space-y-1.5">
                <select
                  value={alg}
                  onChange={(e) => { setAlg(e.target.value); clearAlgo() }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="BFS">BFS</option>
                  <option value="DFS">DFS</option>
                  <option value="DIJKSTRA">Dijkstra</option>
                </select>
                <input
                  type="text"
                  placeholder="Origem (ex: REC)"
                  value={source}
                  onChange={(e) => setSource(e.target.value.toUpperCase())}
                  list="airports-list"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {alg === 'DIJKSTRA' && (
                  <input
                    type="text"
                    placeholder="Destino (ex: POA)"
                    value={target}
                    onChange={(e) => setTarget(e.target.value.toUpperCase())}
                    list="airports-list"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                <datalist id="airports-list">
                  {airports.map((a) => <option key={a} value={a} />)}
                </datalist>
                <button
                  onClick={handleRunAlgo}
                  disabled={!graphData || loading.algo}
                  className="btn-primary w-full text-xs"
                >
                  {loading.algo ? <Spinner /> : 'Executar'}
                </button>
                {algoResult && (
                  <button onClick={clearAlgo} className="btn-secondary w-full text-xs">
                    Limpar resultado
                  </button>
                )}
                {algoResult && <AlgoResult result={algoResult} />}
              </div>
            </section>

            <div className="border-t border-slate-700" />

            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="section-title mb-0">Filtros</p>
                {hasFilter && (
                  <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-300">
                    Limpar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Regiao</p>
                  <div className="flex flex-wrap gap-1">
                    {REGIONS.map((r) => (
                      <Chip
                        key={r}
                        label={r.split('-')[0]}
                        color={REGION_HEX[r]}
                        active={filters.regioes.includes(r)}
                        onClick={() => toggleFilter('regioes', r)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Tipo de ligacao</p>
                  <div className="flex flex-wrap gap-1">
                    {TIPOS.map((t) => (
                      <Chip
                        key={t}
                        label={TIPO_LABELS[t]}
                        color={CONN_COLORS[t]}
                        active={filters.tipos.includes(t)}
                        onClick={() => toggleFilter('tipos', t)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-700" />

            <section>
              <p className="section-title">Caminhos Obrigatorios</p>
              <p className="text-xs text-slate-500 mb-2">
                Clique para destacar e isolar a rota no grafo.
              </p>
              <div className="space-y-1.5">
                <PathBtn
                  label="Recife - Porto Alegre"
                  path={mandatoryPaths?.path1}
                  active={pathHighlights.path1}
                  onClick={() => togglePath('path1')}
                />
                <PathBtn
                  label="Manaus - Sao Paulo"
                  path={mandatoryPaths?.path2}
                  active={pathHighlights.path2}
                  onClick={() => togglePath('path2')}
                />
              </div>
              {!mandatoryPaths && (
                <p className="text-xs text-slate-600 mt-2">
                  Execute as metricas para calcular os caminhos.
                </p>
              )}
            </section>

            <div className="border-t border-slate-700" />

            {graphData && (
              <section>
                <p className="section-title">Conexoes por Regiao</p>
                <p className="text-xs text-slate-500 mb-2">
                  Destaca ligacoes internas de cada regiao.
                </p>
                <div className="flex flex-wrap gap-1">
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => toggleRegionHL(r)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all
                        ${regionEdgeHL[r]
                          ? 'border-transparent text-slate-900'
                          : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                      style={regionEdgeHL[r] ? { background: REGION_HEX[r] } : {}}
                    >
                      {r.split('-')[0]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {(hasHighlight || algoResult) && (
              <>
                <div className="border-t border-slate-700" />
                <div className="flex gap-1.5">
                  {hasHighlight && (
                    <button onClick={clearHighlights} className="btn-secondary flex-1 text-xs">
                      Limpar destaques
                    </button>
                  )}
                  <button onClick={clearAll} className="btn-secondary flex-1 text-xs">
                    Limpar tudo
                  </button>
                </div>
              </>
            )}

          </div>
        </aside>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
