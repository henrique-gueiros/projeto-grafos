import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNbaGraph, runNbaAlgorithm } from '../api.js'
import NbaGraphViewer from '../components/NbaGraphViewer.jsx'
import HighlightsModal from '../components/HighlightsModal.jsx'
import BellmanFordModal from '../components/BellmanFordModal.jsx'

const COURT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 500" preserveAspectRatio="xMidYMid slice">` +
  `<g fill="none" stroke="#ffd9a0" stroke-width="3" stroke-linejoin="round">` +
  `<rect x="14" y="14" width="912" height="472" rx="6"/>` +
  `<line x1="470" y1="14" x2="470" y2="486"/>` +
  `<circle cx="470" cy="250" r="64"/>` +
  `<rect x="14" y="170" width="160" height="160"/>` +
  `<circle cx="174" cy="250" r="60"/>` +
  `<rect x="766" y="170" width="160" height="160"/>` +
  `<circle cx="766" cy="250" r="60"/>` +
  `<path d="M14,42 A248,248 0 0 1 14,458"/>` +
  `<path d="M926,42 A248,248 0 0 0 926,458"/>` +
  `<circle cx="60" cy="250" r="9"/>` +
  `<circle cx="880" cy="250" r="9"/>` +
  `</g>` +
  `<circle cx="470" cy="250" r="7" fill="#ffd9a0"/>` +
  `</svg>`,
)

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
  if (result.algorithm === 'DIJKSTRA' || result.algorithm === 'BELLMAN-FORD') return (
    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs space-y-1">
      <p className="text-slate-400">Custo: <span className="text-amber-400 font-bold">{result.custo ?? 'sem caminho'}</span></p>
      <p className="text-slate-400 break-words">
        Caminho: <span className="text-slate-200">{result.caminho?.join(' → ') ?? 'sem caminho'}</span>
      </p>
      {result.algorithm === 'BELLMAN-FORD' && (
        <p className="text-slate-400">
          Ciclo negativo: <span className={result.has_negative_cycle ? 'text-red-400' : 'text-emerald-400'}>
            {result.has_negative_cycle ? 'detectado' : 'não'}
          </span>
        </p>
      )}
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
  const [showHighlights, setShowHighlights] = useState(false)
  const [showBellman, setShowBellman] = useState(false)

  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [activeAlg, setActiveAlg] = useState(null)
  const [algoResult, setAlgoResult] = useState(null)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => {
    getNbaGraph()
      .then(setData)
      .catch((e) => showToast(e.message ?? 'Erro ao carregar grafo NBA', 'error'))
  }, []) 

  const players = useMemo(() => data?.nodes?.map((n) => n.id) ?? [], [data])

  const toggleTier = (t) =>
    setActiveTiers((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const handleSelect = useCallback((node) => {
    setSelectedNode(node)
    setShowHighlights(false)
    if (node) { setActiveAlg(null) }
  }, [])

  const handleSearch = (val) => {
    setSearch(val)
    if (players.includes(val)) {
      setActiveAlg(null)
      graphRef.current?.focusOn(val)
    }
  }

  const NEEDS_TARGET = ['DIJKSTRA', 'BELLMAN-FORD']

  const runAlgo = async (algName) => {
    if (!source.trim()) { showToast('Informe o jogador de origem.', 'error'); return }
    if (NEEDS_TARGET.includes(algName) && !target.trim()) {
      showToast(`${algName} precisa de um jogador de destino.`, 'error'); return
    }
    setActiveAlg(algName)
    setLoading(algName)
    try {
      const result = await runNbaAlgorithm({
        algorithm: algName,
        source: source.trim(),
        target: NEEDS_TARGET.includes(algName) ? target.trim() : undefined,
      })
      setAlgoResult(result)
      graphRef.current?.clearSelection()
      setSelectedNode(null)

    } catch (e) {
      showToast(e.message ?? 'Erro ao executar algoritmo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = () => {
    setActiveTiers([])
    setShowAllLabels(false)
    setActiveAlg(null)
    setAlgoResult(null)
    setSelectedNode(null)
    setSearch('')
    graphRef.current?.clearSelection()
    graphRef.current?.fit()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f0f1a]">

      <header
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: '#030710', borderBottom: '1px solid rgba(0,150,255,0.12)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 14,
            color: '#7edcff', letterSpacing: '3px',
          }}>
            REDE DE ASSISTÊNCIAS NBA
          </span>
          <span style={{
            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, color: '#1a3a50',
            letterSpacing: '2px', border: '1px solid rgba(0,150,255,0.15)',
            borderRadius: 2, padding: '1px 5px', display: 'inline-block', width: 'fit-content',
          }}>
            PARTE 2
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
            onClick={() => navigate('/parte2/dashboard')}
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

        <main className="flex-1 relative overflow-hidden">
          {}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 45%, #1c2138 0%, #11131f 55%, #08080f 100%)' }}
          />
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url("${COURT}")`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              opacity: 0.13,
            }}
          />
          {}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(232,116,27,0.10), transparent 60%)' }}
          />

          <div className="relative z-[1] w-full h-full">
          <NbaGraphViewer
            ref={graphRef}
            data={data}
            activeTiers={activeTiers}
            showAllLabels={showAllLabels}
            physicsOn={physicsOn}
            onStabilized={() => setPhysicsOn(false)}
            onSelect={handleSelect}
          />
          </div>

          {data && (
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
          )}

          {}
          {data && (
            <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 240 }}>
              {}
              <div style={{
                background: 'rgba(3,6,16,0.88)',
                border: '1px solid rgba(0,150,255,0.12)',
                borderRadius: 3, padding: '4px 10px',
                fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 9,
                color: '#2a5070', letterSpacing: '1px',
                display: 'flex', gap: 12,
              }}>
                <span>⬡ {data.num_nodes} jogadores</span>
                <span>→ {data.num_edges} assistências</span>
              </div>
              {}
              <div style={{
                background: 'rgba(3,6,16,0.88)',
                border: '1px solid rgba(0,150,255,0.12)',
                borderRadius: 3, padding: '8px 10px',
                fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
              }}>
                <p style={{ fontSize: 9, color: '#1a3a50', letterSpacing: '2px', marginBottom: 8 }}>
                  TIER — GRAU TOTAL
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {data.tiers.map((t) => (
                    <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: t.color }} />
                      <span style={{ fontSize: 10, color: '#2a5070', letterSpacing: '0.5px' }}>{t.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(0,150,255,0.10)', margin: '8px 0' }} />
                <p style={{ fontSize: 9, color: '#1a3a50', letterSpacing: '0.5px', lineHeight: 1.6 }}>
                  SETA = direção · ESPESSURA = pontos.<br />
                  Clique num nó para ver vizinhança.
                </p>
              </div>
            </div>
          )}

          {}
          {selectedNode && (
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 10,
              background: 'rgba(3,6,16,0.92)',
              border: '1px solid rgba(0,150,255,0.18)',
              borderRadius: 3, padding: '10px 12px',
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
              maxWidth: 260,
            }}>
              <p style={{ fontSize: 13, color: '#7edcff', letterSpacing: '1px', marginBottom: 8 }}>
                {selectedNode.playerName.toUpperCase()}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 10, color: '#1a3a50', letterSpacing: '0.5px' }}>
                  SAÍDA <span style={{ color: '#2a5070' }}>{selectedNode.out_degree}</span>
                  {'  ·  '}
                  ENTRADA <span style={{ color: '#2a5070' }}>{selectedNode.in_degree}</span>
                </p>
                <p style={{ fontSize: 10, color: '#1a3a50', letterSpacing: '0.5px' }}>
                  TIER <span style={{ color: '#2a5070' }}>{selectedNode.tierLabel}</span>
                </p>
                {selectedNode.best_partner && (
                  <p style={{ fontSize: 10, color: '#1a3a50', letterSpacing: '0.5px' }}>
                    PARCERIA <span style={{ color: '#2a5070' }}>{selectedNode.best_partner}</span>
                    {' '}
                    <span style={{ color: '#1a3a50' }}>({selectedNode.best_partner_pts} pts)</span>
                  </p>
                )}
              </div>
              {selectedNode.tier === 'S' && (
                <button
                  onClick={() => setShowHighlights(true)}
                  style={{
                    marginTop: 10,
                    width: '100%', padding: '5px 0', borderRadius: 3, cursor: 'pointer',
                    fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
                    fontSize: 10, letterSpacing: '2px',
                    border: '1px solid rgba(255,213,79,0.35)',
                    color: '#ffd54f',
                    background: 'rgba(255,213,79,0.06)',
                    transition: 'all 0.15s',
                  }}
                >
                  ▶ HIGHLIGHTS
                </button>
              )}
            </div>
          )}
        </main>

        <aside
          className="w-80 shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#060d1c', borderLeft: '1px solid rgba(0,150,255,0.15)' }}
        >
          {}
          <div className="cockpit-tab-bar">
            <button
              className={`cockpit-tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              ANALYSIS
            </button>
            <button
              className={`cockpit-tab ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              FILTERS
            </button>
          </div>

          <datalist id="nba-players-list">
            {players.map((p) => <option key={p} value={p} />)}
          </datalist>

          {}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'analysis' ? (
              <div>
                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Algorithms</span>
                  <div className="space-y-1.5 mb-3">
                    <div className="relative">
                      <span style={{ position: 'absolute', left: 9, top: 7, fontSize: 11, color: '#1a4060', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>▶</span>
                      <input
                        type="text"
                        placeholder="Origem (ex: G. Antetokounmpo)"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        list="nba-players-list"
                        className="neon-input"
                      />
                    </div>
                    <div className="relative">
                      <span style={{ position: 'absolute', left: 9, top: 7, fontSize: 11, color: '#0a2040', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>▶</span>
                      <input
                        type="text"
                        placeholder="Destino — Dijkstra / Bellman-Ford"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        list="nba-players-list"
                        className="neon-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { id: 'BFS',          label: 'BFS',          cls: 'neon-btn-blue'   },
                      { id: 'DFS',          label: 'DFS',          cls: 'neon-btn-purple' },
                      { id: 'DIJKSTRA',     label: 'DIJKSTRA',     cls: 'neon-btn-gold'   },
                      { id: 'BELLMAN-FORD', label: 'BELLMAN',      cls: 'neon-btn-pink'   },
                    ].map((a) => (
                      <button
                        key={a.id}
                        onClick={() => runAlgo(a.id)}
                        disabled={!data || !!loading}
                        className={`neon-btn ${a.cls} disabled:opacity-40`}
                        style={activeAlg === a.id ? { outline: '1px solid currentColor', outlineOffset: 1 } : {}}
                      >
                        {loading === a.id ? <Spinner /> : a.label}
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: 10, color: '#1a3a50', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, lineHeight: 1.6 }}>
                    Algoritmos rodam sobre o grafo completo (3520 jogadores).
                    Dijkstra/Bellman destacam o caminho; BFS colore por camadas;
                    DFS mostra estatísticas.
                  </p>

                  {algoResult && (
                    <div className="mt-2">
                      <AlgoResult result={algoResult} />
                    </div>
                  )}

                  <button
                    onClick={() => setShowBellman(true)}
                    className="neon-btn neon-btn-pink w-full mt-3"
                    style={{ letterSpacing: 1 }}
                    title="Demonstração de Bellman-Ford com pesos negativos simulados (sem ciclo / com ciclo negativo)"
                  >
                    ⇄ DEMO · PESOS NEGATIVOS
                  </button>
                  <p style={{ fontSize: 10, color: '#1a3a50', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, lineHeight: 1.6, marginTop: 6 }}>
                    A rede real só tem pesos positivos (pontos). A demo isola um trecho
                    com pesos negativos simulados para exercitar Bellman-Ford e a
                    detecção de ciclo negativo.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Buscar Jogador</span>
                  <div className="relative">
                    <span style={{ position: 'absolute', left: 9, top: 7, fontSize: 11, color: '#1a4060', fontFamily: "'ui-sans-serif', monospace", fontWeight: 900 }}>▶</span>
                    <input
                      type="text"
                      placeholder="Digite um nome…"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      list="nba-players-list"
                      className="neon-input"
                    />
                  </div>
                </div>

                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Tier</span>
                  <div className="space-y-1.5">
                    {data?.tiers.map((t) => {
                      const on = activeTiers.includes(t.tier)
                      return (
                        <button
                          key={t.tier}
                          onClick={() => toggleTier(t.tier)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                            padding: '5px 8px', borderRadius: 3,
                            background: on ? `${t.color}1e` : 'transparent',
                            border: on ? `1px solid ${t.color}55` : `1px solid ${t.color}1e`,
                            cursor: 'pointer', transition: 'all 0.15s',
                            fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 11, letterSpacing: '1px',
                          }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: on ? t.color : `${t.color}4d` }} />
                          <span style={{ flex: 1, textAlign: 'left', color: on ? t.color : '#3a4050' }}>
                            {t.label.toUpperCase()} ({t.count})
                          </span>
                          <span style={{ width: 20, height: 10, borderRadius: 5, position: 'relative', flexShrink: 0, background: on ? t.color : '#0d1828', border: on ? 'none' : '1px solid #1a2a3a', transition: 'background 0.15s' }}>
                            <span style={{ position: 'absolute', top: 1, borderRadius: '50%', width: 8, height: 8, background: on ? 'white' : '#1a2a3a', left: on ? 11 : 1, transition: 'left 0.15s' }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {}
                <div className="p-3" style={{ borderBottom: '1px solid rgba(0,150,255,0.08)' }}>
                  <span className="cockpit-label">Exibição</span>
                  <button
                    onClick={() => setShowAllLabels((v) => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 8px', borderRadius: 3,
                      background: showAllLabels ? 'rgba(0,180,255,0.08)' : 'transparent',
                      border: showAllLabels ? '1px solid rgba(0,180,255,0.3)' : '1px solid rgba(0,150,255,0.1)',
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 11, letterSpacing: '1px',
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: showAllLabels ? '#7edcff' : 'rgba(0,180,255,0.3)' }} />
                    <span style={{ flex: 1, textAlign: 'left', color: showAllLabels ? '#7edcff' : '#3a4050' }}>TODOS OS RÓTULOS</span>
                    <span style={{ width: 20, height: 10, borderRadius: 5, position: 'relative', flexShrink: 0, background: showAllLabels ? '#00b4ff' : '#0d1828', border: showAllLabels ? 'none' : '1px solid #1a2a3a', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: 1, borderRadius: '50%', width: 8, height: 8, background: showAllLabels ? 'white' : '#1a2a3a', left: showAllLabels ? 11 : 1, transition: 'left 0.15s' }} />
                    </span>
                  </button>
                </div>

                {}
                <div className="p-3">
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
            <span style={{ color: '#1a3a50' }}>NBA ASSIST</span>
            <span style={{ color: '#0a6040' }}>● ONLINE</span>
          </div>
        </aside>
      </div>

      {showHighlights && selectedNode && (
        <HighlightsModal
          playerName={selectedNode.playerName}
          onClose={() => setShowHighlights(false)}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <BellmanFordModal open={showBellman} onClose={() => setShowBellman(false)} graphData={data} />
    </div>
  )
}
