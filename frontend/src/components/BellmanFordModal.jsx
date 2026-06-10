import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import NbaGraphViewer from './NbaGraphViewer.jsx'

const GOLD = '#ffb74d'
const PINK = '#f472b6'
const GREEN = '#22dd88'

const EDGE_FONT = { color: '#f4f4ff', size: 18, strokeWidth: 4, strokeColor: '#0a0e1a', align: 'top' }
const ARROWS = { to: { enabled: true, scaleFactor: 0.6, type: 'arrow' } }

function pickSubNodes(nodes) {
  const L = nodes.length
  const idx = [0, 0.22, 0.44, 0.66, 0.85].map((f) => Math.min(L - 1, Math.floor(f * L)))
  const seen = new Set()
  const picked = []
  for (const i of idx) {
    let j = i
    while (seen.has(j)) j = (j + 1) % L
    seen.add(j)
    picked.push(nodes[j])
  }
  return picked
}

function buildEdges(ids, withCycle) {
  const [a, b, c, d, e] = ids
  const defs = [
    [a, b, 4],
    [a, c, 5],
    [b, c, -2], 
    [b, d, 6],
    [c, d, 3],
    [d, e, 4],
    [d, b, withCycle ? -8 : 1], 
  ]
  return defs.map(([from, to, w], i) => {
    const neg = w < 0
    return {
      id: i,
      from,
      to,
      label: `${w}`,
      weight: w,
      width: neg ? 3 : 2,
      font: { ...EDGE_FONT, color: neg ? PINK : '#f4f4ff' },
      color: { color: neg ? PINK : '#5a5a82', highlight: '#4fc3f7', hover: '#8888cc', opacity: 0.9 },
      arrows: ARROWS,
      smooth: { type: 'curvedCW', roundness: 0.18 },
      tooltipHtml: `<b>${from}</b> &rarr; <b>${to}</b><br><b>Peso simulado:</b> ${w}`,
    }
  })
}

function bellmanFord(nodes, edges, source) {
  const INF = Infinity
  const dist = Object.fromEntries(nodes.map((n) => [n, INF]))
  const prev = Object.fromEntries(nodes.map((n) => [n, null]))
  dist[source] = 0

  for (let i = 0; i < nodes.length - 1; i++) {
    let updated = false
    for (const e of edges) {
      if (dist[e.from] === INF) continue
      if (dist[e.from] + e.weight < dist[e.to]) {
        dist[e.to] = dist[e.from] + e.weight
        prev[e.to] = e.from
        updated = true
      }
    }
    if (!updated) break
  }

  const negNodes = new Set()
  let hasNegativeCycle = false
  for (const e of edges) {
    if (dist[e.from] === INF) continue
    if (dist[e.from] + e.weight < dist[e.to]) {
      hasNegativeCycle = true
      negNodes.add(e.from)
      negNodes.add(e.to)
    }
  }
  return { dist, prev, hasNegativeCycle, negNodes }
}

function pathTo(prev, source, target) {
  const path = []
  const seen = new Set()
  let cur = target
  while (cur != null && !seen.has(cur)) {
    seen.add(cur)
    path.push(cur)
    if (cur === source) break
    cur = prev[cur]
  }
  path.reverse()
  return path[0] === source ? path : null
}

function short(name) {
  return name.length > 16 ? name.split(' ').slice(-1)[0] : name
}

export default function BellmanFordModal({ open, onClose, graphData }) {
  const overlayRef = useRef(null)
  const viewerRef = useRef(null)

  const [withCycle, setWithCycle] = useState(false)
  const [physicsOn, setPhysicsOn] = useState(true)
  const [animation, setAnimation] = useState(null)

  useEffect(() => {
    if (!open) return
    const handler = (ev) => { if (ev.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  
  const subIds = useMemo(() => {
    if (!graphData?.nodes?.length) return []
    return pickSubNodes(graphData.nodes).map((n) => n.id)
  }, [graphData])

  const subEdges = useMemo(() => buildEdges(subIds, withCycle), [subIds, withCycle])

  
  const reducedData = useMemo(() => {
    if (subIds.length < 5) return null
    const byId = Object.fromEntries(graphData.nodes.map((n) => [n.id, n]))
    return {
      nodes: subIds.map((id) => byId[id]),
      edges: subEdges,
      tiers: graphData.tiers ?? [],
      num_nodes: subIds.length,
      num_edges: subEdges.length,
    }
  }, [subIds, subEdges, graphData])

  const source = subIds[0]
  const target = subIds[4]

  const result = useMemo(() => {
    if (subIds.length < 5) return null
    return bellmanFord(subIds, subEdges, source)
  }, [subIds, subEdges, source])

  const minPath = useMemo(() => {
    if (!result || result.hasNegativeCycle) return null
    return pathTo(result.prev, source, target)
  }, [result, source, target])

  
  useEffect(() => {
    if (!open) return
    setPhysicsOn(true)
    setAnimation(null)
  }, [withCycle, open])

  const run = () => {
    if (!result) return
    if (result.hasNegativeCycle) {
      
      const cyc = [...result.negNodes]
      const edges = subEdges
        .filter((e) => cyc.includes(e.from) && cyc.includes(e.to))
        .map((e) => [e.from, e.to])
      setAnimation({ startNode: cyc[0], edges, accent: PINK })
    } else if (minPath) {
      const edges = []
      for (let i = 0; i < minPath.length - 1; i++) edges.push([minPath[i], minPath[i + 1]])
      setAnimation({ startNode: source, edges, accent: GOLD })
    }
  }

  if (!open) return null

  const handleOverlayClick = (ev) => {
    if (ev.target === overlayRef.current) onClose()
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col"
        style={{
          background: '#0a0e1a',
          borderColor: `${PINK}40`,
          boxShadow: `0 0 50px ${PINK}22`,
          maxHeight: '94vh',
        }}
      >
        {}
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ background: `${PINK}20` }}>⇄</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: PINK }}>
                Subgrafo da rede NBA · Pesos negativos simulados
              </p>
              <p className="text-base font-bold text-slate-100 leading-tight">
                Bellman-Ford — caminho mínimo com pesos negativos
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none mt-0.5 shrink-0" aria-label="Fechar">✕</button>
        </div>

        <div className="h-px w-full" style={{ background: `${PINK}25` }} />

        <div className="p-5 pt-4 overflow-y-auto space-y-3">
          {!reducedData ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              Carregando subgrafo da rede NBA…
            </div>
          ) : (
            <>
              {}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setWithCycle(false)}
                  className={`neon-btn ${!withCycle ? 'neon-btn-gold' : 'neon-btn-dim'}`}
                  style={{ fontSize: 10 }}
                >
                  SEM CICLO NEGATIVO
                </button>
                <button
                  onClick={() => setWithCycle(true)}
                  className={`neon-btn ${withCycle ? 'neon-btn-pink' : 'neon-btn-dim'}`}
                  style={{ fontSize: 10 }}
                >
                  ⚠ COM CICLO NEGATIVO
                </button>
                <div className="flex-1" />
                <button onClick={run} className="neon-btn neon-btn-blue" style={{ fontSize: 10 }}>
                  {withCycle ? '▶ MOSTRAR CICLO' : '▶ MOSTRAR CAMINHO'}
                </button>
                <button onClick={() => { setAnimation(null); viewerRef.current?.fit() }} className="neon-btn neon-btn-dim" style={{ fontSize: 10 }}>
                  LIMPAR
                </button>
              </div>

              {}
              <div
                className="rounded-xl overflow-hidden relative"
                style={{
                  height: 380,
                  border: '1px solid rgba(0,150,255,0.12)',
                  background: 'radial-gradient(ellipse 80% 80% at 50% 45%, #1c2138 0%, #11131f 55%, #08080f 100%)',
                }}
              >
                <NbaGraphViewer
                  ref={viewerRef}
                  key={withCycle ? 'com' : 'sem'}
                  data={reducedData}
                  animation={animation}
                  physicsOn={physicsOn}
                  onStabilized={() => setPhysicsOn(false)}
                />
                <div
                  className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] px-2 py-1 rounded"
                  style={{ background: 'rgba(3,6,16,0.82)', border: '1px solid rgba(0,150,255,0.12)', fontFamily: 'ui-monospace, monospace', pointerEvents: 'none' }}
                >
                  <span style={{ color: PINK }}>● peso negativo</span>
                  <span style={{ color: GOLD }}>● caminho mínimo</span>
                  <span className="text-slate-500">números nas arestas = peso simulado</span>
                </div>
              </div>

              {}
              {result && (result.hasNegativeCycle ? (
                <div className="rounded-xl p-4" style={{ background: `${PINK}12`, border: `1px solid ${PINK}55` }}>
                  <p className="font-bold text-sm mb-1" style={{ color: PINK }}>⚠ Ciclo negativo detectado</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Na n-ésima iteração ainda houve relaxamento — prova de um ciclo de custo total
                    negativo ({short(subIds[1])} → {short(subIds[2])} → {short(subIds[3])} → {short(subIds[1])}).
                    Não existe caminho mínimo bem-definido (os custos divergem para −∞). Clique em
                    <b className="text-slate-200"> MOSTRAR CICLO</b> para vê-lo no grafo.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl p-4" style={{ background: 'rgba(34,221,136,0.08)', border: '1px solid rgba(34,221,136,0.35)' }}>
                  <p className="font-bold text-sm mb-1" style={{ color: GREEN }}>
                    ✓ Caminho mínimo · custo {minPath ? result.dist[target] : '—'}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    {minPath
                      ? <>{minPath.map(short).join('  →  ')}</>
                      : 'sem caminho'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    O caminho usa a aresta de peso <span style={{ color: PINK }}>negativo ({short(subIds[1])} → {short(subIds[2])} = −2)</span>,
                    onde Dijkstra falharia mas Bellman-Ford funciona.
                  </p>
                </div>
              ))}

              <p className="text-[10px] text-slate-600 text-center">
                Mesmo grafo da Parte 2, reduzido a 5 jogadores reais · pesos negativos simulados ·
                algoritmo espelha <code className="text-slate-500">src/graphs/digraph_algorithms.py</code>.
                Esc ou clique fora para fechar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
