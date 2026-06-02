import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNbaGraph, runNbaAlgorithm } from '../api.js'
import NbaGraphViewer from '../components/NbaGraphViewer.jsx'

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

function AlgoResult({ result }) {
  if (!result) return null
  if (result.algorithm === 'DIJKSTRA') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Custo: <span className="text-amber-400 font-bold">{result.custo ?? 'sem caminho'}</span></p>
      <p className="text-slate-400 break-words">
        Caminho: <span className="text-slate-200">{result.caminho?.join(' → ') ?? 'sem caminho'}</span>
      </p>
    </div>
  )
  if (result.algorithm === 'BFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Visitados: <span className="text-sky-400 font-bold">{result.nodes_visited}</span></p>
      <p className="text-slate-400">Camadas: <span className="text-sky-400 font-bold">{result.num_layers}</span></p>
      <div className="max-h-24 overflow-y-auto space-y-0.5 text-slate-500">
        {result.layers?.map((l, i) => (
          <p key={i}><span className="text-slate-600">L{i}:</span> {l.length} nós</p>
        ))}
      </div>
    </div>
  )
  if (result.algorithm === 'DFS') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Visitados: <span className="text-emerald-400 font-bold">{result.nodes_visited}</span></p>
      <p className="text-slate-400">
        Ciclo: <span className={result.has_cycle ? 'text-red-400' : 'text-emerald-400'}>
          {result.has_cycle ? 'detectado' : 'não'}
        </span>
      </p>
      <p className="text-slate-400">
        árvore: {result.edge_types?.tree} · retorno: {result.edge_types?.back} ·
        avanço: {result.edge_types?.forward} · cruz.: {result.edge_types?.cross}
      </p>
    </div>
  )
  return null
}

export default function NbaGraph() {
  const navigate = useNavigate()
  const graphRef = useRef(null)

  const [data, setData] = useState(null)
  const [activeTiers, setActiveTiers] = useState([])
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [physicsOn, setPhysicsOn] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)

  const [alg, setAlg] = useState('DIJKSTRA')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [algoResult, setAlgoResult] = useState(null)
  const [algoHighlight, setAlgoHighlight] = useState(null)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => {
    getNbaGraph()
      .then(setData)
      .catch((e) => showToast(e.message ?? 'Erro ao carregar grafo NBA', 'error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const players = useMemo(() => data?.nodes?.map((n) => n.id) ?? [], [data])

  const toggleTier = (t) =>
    setActiveTiers((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const handleSelect = useCallback((node) => {
    setSelectedNode(node)
    if (node) setAlgoHighlight(null) // clicar num nó tem prioridade sobre destaque de algoritmo
  }, [])

  const handleSearch = (val) => {
    setSearch(val)
    if (players.includes(val)) {
      setAlgoHighlight(null)
      graphRef.current?.focusOn(val)
    }
  }

  const handleRunAlgo = async () => {
    if (!source.trim()) { showToast('Informe o jogador de origem.', 'error'); return }
    setLoading(true)
    try {
      const result = await runNbaAlgorithm({
        algorithm: alg,
        source: source.trim(),
        target: alg === 'DIJKSTRA' ? target.trim() : undefined,
      })
      setAlgoResult(result)
      graphRef.current?.clearSelection()
      setSelectedNode(null)

      if (result.algorithm === 'BFS') {
        const layerMap = {}
        result.layers.forEach((layer, i) => layer.forEach((n) => { layerMap[n] = i }))
        setAlgoHighlight({ type: 'BFS', layerMap })
      } else if (result.algorithm === 'DIJKSTRA' && result.caminho) {
        const pathNodes = new Set(result.caminho)
        const pathEdges = new Set()
        for (let i = 0; i < result.caminho.length - 1; i++) {
          pathEdges.add(`${result.caminho[i]}>${result.caminho[i + 1]}`)
        }
        setAlgoHighlight({ type: 'DIJKSTRA', pathNodes, pathEdges })
      } else {
        setAlgoHighlight(null) // DFS / sem caminho: apenas resultado textual
      }
    } catch (e) {
      showToast(e.message ?? 'Erro ao executar algoritmo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = () => {
    setActiveTiers([])
    setShowAllLabels(false)
    setAlgoResult(null)
    setAlgoHighlight(null)
    setSelectedNode(null)
    setSearch('')
    graphRef.current?.clearSelection()
    graphRef.current?.fit()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f0f1a]">

      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100">🏀 Parte 2 — Rede de Assistências NBA</h1>
          <p className="text-xs text-slate-500">Grafo dirigido ponderado · tier por grau total</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => navigate('/')} className="btn-secondary text-xs">Início</button>
          <button onClick={() => navigate('/parte2/dashboard')} className="btn-primary text-xs">Dashboard</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <main className="flex-1 relative overflow-hidden">
          <NbaGraphViewer
            ref={graphRef}
            data={data}
            activeTiers={activeTiers}
            showAllLabels={showAllLabels}
            algoHighlight={algoHighlight}
            physicsOn={physicsOn}
            onStabilized={() => setPhysicsOn(false)}
            onSelect={handleSelect}
          />

          {data && (
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
                {physicsOn ? 'Pausar física' : 'Retomar física'}
              </button>
            </div>
          )}

          {/* stats + legenda */}
          {data && (
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 z-10 max-w-[240px]">
              <span className="text-xs bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-400">
                {data.num_nodes} jogadores · {data.num_edges} assistências
              </span>
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Tier (grau total)</p>
                <div className="space-y-1">
                  {data.tiers.map((t) => (
                    <div key={t.tier} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.label}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-700 my-1.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Seta = direção da assistência · espessura = pontos gerados.
                  Clique num nó para ver a vizinhança.
                </p>
              </div>
            </div>
          )}

          {/* painel de info do nó selecionado */}
          {selectedNode && (
            <div className="absolute top-3 left-3 z-10 bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-2.5 text-xs shadow-xl max-w-[260px]">
              <p className="font-bold text-sm text-amber-300 mb-1">{selectedNode.playerName}</p>
              <p className="text-slate-400">Grau saída: <span className="text-slate-200">{selectedNode.out_degree}</span> ·
                {' '}entrada: <span className="text-slate-200">{selectedNode.in_degree}</span></p>
              <p className="text-slate-400">Tier: <span className="text-slate-200">{selectedNode.tierLabel}</span></p>
              {selectedNode.best_partner && (
                <p className="text-slate-400">Melhor parceria: <span className="text-slate-200">{selectedNode.best_partner}</span> ({selectedNode.best_partner_pts} pts)</p>
              )}
            </div>
          )}
        </main>

        <aside className="w-80 shrink-0 bg-slate-800/80 border-l border-slate-700 overflow-y-auto">
          <div className="p-3 space-y-4">

            <section>
              <p className="section-title">Buscar jogador</p>
              <input
                type="text"
                placeholder="Digite um nome…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                list="nba-players-list"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <datalist id="nba-players-list">
                {players.map((p) => <option key={p} value={p} />)}
              </datalist>
            </section>

            <div className="border-t border-slate-700" />

            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="section-title mb-0">Filtrar por tier</p>
                {activeTiers.length > 0 && (
                  <button onClick={() => setActiveTiers([])} className="text-xs text-slate-500 hover:text-slate-300">
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {data?.tiers.map((t) => {
                  const on = activeTiers.includes(t.tier)
                  return (
                    <button
                      key={t.tier}
                      onClick={() => toggleTier(t.tier)}
                      aria-pressed={on}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left
                        ${on ? 'border-transparent text-slate-900 font-medium' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                      style={on ? { background: t.color } : {}}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.label} ({t.count})
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="border-t border-slate-700" />

            <section>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="section-title mb-0">Mostrar todos os rótulos</span>
                <input
                  type="checkbox"
                  checked={showAllLabels}
                  onChange={(e) => setShowAllLabels(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
              </label>
            </section>

            <div className="border-t border-slate-700" />

            <section>
              <p className="section-title">Algoritmo</p>
              <div className="space-y-1.5">
                <select
                  value={alg}
                  onChange={(e) => { setAlg(e.target.value); setAlgoResult(null); setAlgoHighlight(null) }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="BFS">BFS</option>
                  <option value="DFS">DFS</option>
                  <option value="DIJKSTRA">Dijkstra</option>
                </select>
                <input
                  type="text"
                  placeholder="Origem (ex: G. Antetokounmpo)"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  list="nba-players-list"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {alg === 'DIJKSTRA' && (
                  <input
                    type="text"
                    placeholder="Destino (ex: L. James)"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    list="nba-players-list"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
                <button
                  onClick={handleRunAlgo}
                  disabled={!data || loading}
                  className="btn-primary w-full text-xs"
                >
                  {loading ? <Spinner /> : 'Executar'}
                </button>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Algoritmos rodam sobre o grafo completo ({data?.num_nodes ? '3520' : '…'} jogadores).
                  O destaque no grafo aparece nos nós presentes nesta amostra.
                </p>
                {algoResult && <AlgoResult result={algoResult} />}
              </div>
            </section>

            <div className="border-t border-slate-700" />

            <button onClick={clearAll} className="btn-secondary w-full text-xs">
              Limpar / Mostrar tudo
            </button>

          </div>
        </aside>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
