import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

export const REGION_HEX = {
  Norte: '#2dd4bf',
  Nordeste: '#fb923c',
  Sudeste: '#818cf8',
  Sul: '#4ade80',
  'Centro-Oeste': '#fbbf24',
}

export const CONN_COLORS = {
  hub: '#3b82f6',
  regional: '#10b981',
  'hub-hub': '#a78bfa',
  inter_regional: '#f59e0b',
}

const LAYER_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#818cf8',
  '#fb923c', '#2dd4bf', '#f87171', '#a78bfa',
]

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

const GraphViewer = forwardRef(function GraphViewer(
  {
    data,
    filters = { regioes: [], tipos: [] },
    pathHighlights = { path1: false, path2: false },
    regionEdgeHL = {},
    mandatoryPaths = null,
    animation = null, // { startNode, edges: [[from,to],...], accent }
    physicsOn = true,
    onStabilized,
  },
  ref,
) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const nodesDS = useRef(null)
  const edgesDS = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const tooltipPosRef = useRef({ x: 0, y: 0 })
  const tooltipElRef = useRef(null)

  // animação de percurso de algoritmo
  const [animStep, setAnimStep] = useState(0)
  const animTimerRef = useRef(null)

  useEffect(() => {
    if (animTimerRef.current) { clearInterval(animTimerRef.current); animTimerRef.current = null }
    if (!animation) { setAnimStep(0); return }
    setAnimStep(0)
    const total = animation.edges?.length ?? 0
    if (total === 0) return
    const stepMs = Math.max(35, Math.min(320, Math.round(3500 / total)))
    animTimerRef.current = setInterval(() => {
      setAnimStep((s) => {
        if (s >= total) { clearInterval(animTimerRef.current); animTimerRef.current = null; return s }
        return s + 1
      })
    }, stepMs)
    return () => { if (animTimerRef.current) { clearInterval(animTimerRef.current); animTimerRef.current = null } }
  }, [animation])

  useImperativeHandle(ref, () => ({
    fit() {
      networkRef.current?.fit({
        animation: { duration: 400, easingFunction: 'easeInOutQuad' },
      })
    },
  }))

  useEffect(() => {
    if (!containerRef.current || !data) return

    const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]))
    const edgeById = Object.fromEntries(data.edges.map((e) => [e.id, e]))

    const vNodes = new DataSet(
      data.nodes.map((n) => ({
        id: n.id,
        label: n.id,
        group: n.regiao,
        color: {
          background: REGION_HEX[n.regiao] ?? '#64748b',
          border: '#0f172a',
          highlight: { background: '#f59e0b', border: '#d97706' },
          hover: { background: '#fcd34d', border: '#d97706' },
        },
        font: { color: '#ffffff', size: 11, bold: true },
        size: 14,
      })),
    )

    const vEdges = new DataSet(
      data.edges.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        tipo: e.tipo,
        color: { color: CONN_COLORS[e.tipo] ?? '#475569', opacity: 1 },
        width: 1,
        smooth: { type: 'continuous', roundness: 0.2 },
      })),
    )

    nodesDS.current = vNodes
    edgesDS.current = vEdges

    const network = new Network(
      containerRef.current,
      { nodes: vNodes, edges: vEdges },
      {
        nodes: { shape: 'dot', borderWidth: 2 },
        edges: { smooth: { type: 'continuous', roundness: 0.2 } },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -4500,
            centralGravity: 0.3,
            springLength: 130,
            springConstant: 0.04,
          },
          stabilization: { iterations: 200 },
        },
        interaction: { hover: true, navigationButtons: true },
      },
    )

    network.on('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: false } })
      onStabilized?.()
    })

    network.on('hoverNode', ({ node }) => {
      const n = nodeById[node]
      if (n) setTooltip({ type: 'node', data: n })
    })
    network.on('blurNode', () => setTooltip(null))

    network.on('hoverEdge', ({ edge }) => {
      const e = edgeById[edge]
      if (e) setTooltip({ type: 'edge', data: e })
    })
    network.on('blurEdge', () => setTooltip(null))

    networkRef.current = network

    return () => {
      network.destroy()
      networkRef.current = null
      nodesDS.current = null
      edgesDS.current = null
      setTooltip(null)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    networkRef.current?.setOptions({ physics: { enabled: physicsOn } })
  }, [physicsOn])

  useEffect(() => {
    if (!nodesDS.current || !edgesDS.current || !data) return

    // ---- Modo animação: dim total + revelação progressiva do percurso ----
    if (animation) {
      const accent = animation.accent ?? '#f59e0b'
      const edges = animation.edges ?? []
      const revealedNodes = new Set(animation.startNode ? [animation.startNode] : [])
      const revealedEdges = new Set()
      for (let i = 0; i < Math.min(animStep, edges.length); i++) {
        const [a, b] = edges[i]
        revealedNodes.add(a); revealedNodes.add(b)
        revealedEdges.add(edgeKey(a, b))
      }
      const newest = animStep > 0 && animStep <= edges.length ? edges[animStep - 1]?.[1] : animation.startNode

      nodesDS.current.update(data.nodes.map((n) => {
        const on = revealedNodes.has(n.id)
        const isNewest = n.id === newest
        return {
          id: n.id,
          hidden: false,
          opacity: on ? 1 : 0.12,
          size: isNewest ? 22 : on ? 17 : 13,
          color: {
            background: REGION_HEX[n.regiao] ?? '#64748b',
            border: on ? accent : '#0f172a',
            highlight: { background: accent, border: '#ffffff' },
            hover: { background: accent, border: '#ffffff' },
          },
        }
      }))

      edgesDS.current.update(data.edges.map((e) => {
        const on = revealedEdges.has(edgeKey(e.from, e.to))
        return {
          id: e.id,
          hidden: false,
          color: on ? { color: accent, opacity: 1 } : { color: '#475569', opacity: 0.06 },
          width: on ? 4 : 1,
        }
      }))
      return
    }

    const { regioes, tipos } = filters
    const { path1: p1Active, path2: p2Active } = pathHighlights
    const anyPath = p1Active || p2Active
    const anyRegionHL = Object.values(regionEdgeHL).some(Boolean)

    const nodeMap = Object.fromEntries(data.nodes.map((n) => [n.id, n]))

    let allowedByPath = null
    if (anyPath && mandatoryPaths) {
      allowedByPath = new Set()
      if (p1Active) mandatoryPaths.path1?.nodes?.forEach((n) => allowedByPath.add(n))
      if (p2Active) mandatoryPaths.path2?.nodes?.forEach((n) => allowedByPath.add(n))
    }

    const hiddenNodes = new Set()

    const nodeUpdates = data.nodes.map((n) => {
      let hidden = false
      if (allowedByPath) {
        hidden = !allowedByPath.has(n.id)
      } else if (regioes.length > 0 && !regioes.includes(n.regiao)) {
        hidden = true
      }
      if (hidden) hiddenNodes.add(n.id)

      return {
        id: n.id,
        hidden,
        opacity: 1,
        size: 14,
        color: {
          background: REGION_HEX[n.regiao] ?? '#64748b',
          border: '#0f172a',
          highlight: { background: '#f59e0b', border: '#d97706' },
          hover: { background: '#fcd34d', border: '#d97706' },
        },
      }
    })

    nodesDS.current.update(nodeUpdates)

    const path1Set = new Set()
    const path2Set = new Set()
    mandatoryPaths?.path1?.edges?.forEach(([a, b]) => path1Set.add(edgeKey(a, b)))
    mandatoryPaths?.path2?.edges?.forEach(([a, b]) => path2Set.add(edgeKey(a, b)))

    const regionSets = {}
    Object.keys(regionEdgeHL).forEach((regiao) => {
      if (!regionEdgeHL[regiao]) return
      regionSets[regiao] = new Set()
      data.edges.forEach((e) => {
        if (nodeMap[e.from]?.regiao === regiao && nodeMap[e.to]?.regiao === regiao) {
          regionSets[regiao].add(edgeKey(e.from, e.to))
        }
      })
    })

    const edgeUpdates = data.edges.map((e) => {
      const key = edgeKey(e.from, e.to)

      if (hiddenNodes.has(e.from) || hiddenNodes.has(e.to)) {
        return { id: e.id, hidden: true, color: { color: '#475569', opacity: 1 }, width: 1 }
      }
      if (!anyPath && tipos.length > 0 && !tipos.includes(e.tipo)) {
        return { id: e.id, hidden: true, color: { color: '#475569', opacity: 1 }, width: 1 }
      }

      const inP1 = p1Active && path1Set.has(key)
      const inP2 = p2Active && path2Set.has(key)
      if (inP1 && inP2) {
        return { id: e.id, hidden: false, color: { color: '#ffaa00', opacity: 1 }, width: 5 }
      }
      if (inP1) {
        return { id: e.id, hidden: false, color: { color: mandatoryPaths.path1.color, opacity: 1 }, width: 4 }
      }
      if (inP2) {
        return { id: e.id, hidden: false, color: { color: mandatoryPaths.path2.color, opacity: 1 }, width: 4 }
      }

      if (anyRegionHL) {
        for (const [regiao, rset] of Object.entries(regionSets)) {
          if (rset.has(key)) {
            return { id: e.id, hidden: false, color: { color: REGION_HEX[regiao] ?? '#64748b', opacity: 1 }, width: 3 }
          }
        }
        return { id: e.id, hidden: false, color: { color: '#475569', opacity: 0.1 }, width: 1 }
      }

      if (anyPath) {
        return { id: e.id, hidden: false, color: { color: '#475569', opacity: 0.1 }, width: 1 }
      }

      return { id: e.id, hidden: false, color: { color: CONN_COLORS[e.tipo] ?? '#475569', opacity: 1 }, width: 1 }
    })

    edgesDS.current.update(edgeUpdates)
  }, [filters, pathHighlights, regionEdgeHL, mandatoryPaths, animation, animStep, data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 select-none">
        <p className="text-base font-medium">Grafo nao carregado</p>
        <p className="text-sm text-center px-8">
          Carregue <code className="text-slate-400">aeroportos_data.csv</code> e execute{' '}
          <b className="text-slate-300">gerar</b> pelo terminal.
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full"
      onMouseMove={(ev) => {
        tooltipPosRef.current = { x: ev.clientX, y: ev.clientY }
        if (tooltipElRef.current) {
          const x = ev.clientX + 14
          const y = ev.clientY - 10
          tooltipElRef.current.style.left = x + 'px'
          tooltipElRef.current.style.top = y + 'px'
        }
      }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {tooltip && (
        <div
          ref={tooltipElRef}
          className="fixed z-50 pointer-events-none select-none rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltipPosRef.current.x + 14,
            top: tooltipPosRef.current.y - 10,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, monospace',
            minWidth: 160,
          }}
        >
          {tooltip.type === 'node' ? (
            <>
              <p className="font-bold text-sm text-white mb-1">{tooltip.data.id}</p>
              <p><span className="text-slate-400">Cidade:</span> {tooltip.data.cidade}</p>
              <p><span className="text-slate-400">Regiao:</span> {tooltip.data.regiao}</p>
              <p><span className="text-slate-400">Grau:</span> {tooltip.data.grau ?? '–'}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-sm text-white mb-1">
                {tooltip.data.from} — {tooltip.data.to}
              </p>
              <p><span className="text-slate-400">Tipo:</span> {tooltip.data.tipo}</p>
              <p><span className="text-slate-400">Peso:</span> {tooltip.data.weight}</p>
              <p className="max-w-xs text-slate-300 mt-0.5">{tooltip.data.justificativa}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
})

export default GraphViewer
