import {
  forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

// cores das camadas BFS (destaque de algoritmo)
const LAYER_COLORS = [
  '#ffd54f', '#4fc3f7', '#81c784', '#ff8a65',
  '#b39ddb', '#f06292', '#4dd0e1', '#aed581',
]

const DIM_NODE = { background: 'rgba(40,40,55,0.3)', border: 'rgba(60,60,80,0.3)' }
const DIM_EDGE = { color: '#1a1a28', opacity: 0.1 }
const NEIGH_EDGE = { color: '#4fc3f7', opacity: 0.9 }

function dirKey(a, b) {
  return `${a}>${b}`
}

const NbaGraphViewer = forwardRef(function NbaGraphViewer(
  {
    data,
    activeTiers = [],
    showAllLabels = false,
    algoHighlight = null, // { type, layerMap?, pathNodes?(Set), pathEdges?(Set of "a>b") }
    physicsOn = true,
    onStabilized,
    onSelect,
  },
  ref,
) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const nodesDS = useRef(null)
  const edgesDS = useRef(null)

  const [selected, setSelected] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const tooltipPosRef = useRef({ x: 0, y: 0 })
  const tooltipElRef = useRef(null)

  // adjacência (não-dirigida) + metadados originais por id
  const meta = useMemo(() => {
    if (!data) return null
    const adj = {}
    const tierById = {}
    const origColor = {}
    const origSize = {}
    data.nodes.forEach((n) => {
      adj[n.id] = new Set()
      tierById[n.id] = n.tier
      origColor[n.id] = n.color
      origSize[n.id] = n.size
    })
    data.edges.forEach((e) => {
      adj[e.from]?.add(e.to)
      adj[e.to]?.add(e.from)
    })
    return { adj, tierById, origColor, origSize }
  }, [data])

  useImperativeHandle(ref, () => ({
    fit() {
      networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } })
    },
    focusOn(id) {
      if (!networkRef.current || !nodesDS.current?.get(id)) return
      networkRef.current.focus(id, { scale: 2.2, animation: { duration: 700 } })
      setSelected(id)
    },
    clearSelection() {
      setSelected(null)
    },
  }))

  // ---- instanciar a rede ----
  useEffect(() => {
    if (!containerRef.current || !data) return

    const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]))
    const edgeById = Object.fromEntries(data.edges.map((e) => [e.id, e]))

    const vNodes = new DataSet(data.nodes.map((n) => ({ ...n })))
    const vEdges = new DataSet(data.edges.map((e) => ({ ...e })))
    nodesDS.current = vNodes
    edgesDS.current = vEdges

    const network = new Network(
      containerRef.current,
      { nodes: vNodes, edges: vEdges },
      {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -80,
            centralGravity: 0.005,
            springLength: 160,
            springConstant: 0.05,
            damping: 0.45,
          },
          stabilization: { iterations: 300, fit: true },
        },
        interaction: {
          hover: true,
          tooltipDelay: 9999999,
          navigationButtons: true,
          keyboard: { enabled: false },
        },
        nodes: {
          scaling: { min: 8, max: 45, label: { enabled: true, min: 10, max: 20, drawThreshold: 8 } },
        },
        edges: {
          smooth: { type: 'curvedCW', roundness: 0.12 },
          scaling: { min: 1, max: 7 },
        },
      },
    )

    network.on('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: false } })
      onStabilized?.()
    })

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const id = params.nodes[0]
        setSelected(id)
        onSelect?.(nodeById[id] ?? null)
      } else {
        setSelected(null)
        onSelect?.(null)
      }
    })

    network.on('hoverNode', ({ node }) => {
      const n = nodeById[node]
      if (n?.tooltipHtml) setTooltip(n.tooltipHtml)
    })
    network.on('blurNode', () => setTooltip(null))
    network.on('hoverEdge', ({ edge }) => {
      const e = edgeById[edge]
      if (e?.tooltipHtml) setTooltip(e.tooltipHtml)
    })
    network.on('blurEdge', () => setTooltip(null))
    network.on('dragStart', () => setTooltip(null))
    network.on('zoom', () => setTooltip(null))

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

  // notificar o pai quando a seleção muda via busca / clique
  useEffect(() => {
    if (!nodesDS.current) return
    if (selected) onSelect?.(nodesDS.current.get(selected) ?? null)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- recomputar estilos (filtro + labels + vizinhança + algoritmo) ----
  useEffect(() => {
    if (!nodesDS.current || !edgesDS.current || !data || !meta) return

    const { adj, tierById, origColor, origSize } = meta
    const tierFilterOn = activeTiers.length > 0
    const isVisible = (id) => !tierFilterOn || activeTiers.includes(tierById[id])

    let neigh = null
    if (selected) {
      neigh = new Set(adj[selected] ?? [])
      neigh.add(selected)
    }

    const bfsLayers = algoHighlight?.type === 'BFS' ? algoHighlight.layerMap : null
    const dijkstraNodes = algoHighlight?.type === 'DIJKSTRA' ? algoHighlight.pathNodes : null
    const dijkstraEdges = algoHighlight?.type === 'DIJKSTRA' ? algoHighlight.pathEdges : null

    const nodeUpdates = data.nodes.map((n) => {
      const label = showAllLabels ? n.playerName : n.defaultLabel
      const hidden = !isVisible(n.id)
      if (hidden) return { id: n.id, hidden: true, label }

      let color = origColor[n.id]
      let size = origSize[n.id]

      if (neigh) {
        color = neigh.has(n.id) ? origColor[n.id] : DIM_NODE
      } else if (bfsLayers) {
        const l = bfsLayers[n.id]
        color = l !== undefined ? { background: LAYER_COLORS[l % LAYER_COLORS.length], border: '#0f0f1a' } : DIM_NODE
      } else if (dijkstraNodes) {
        if (dijkstraNodes.has(n.id)) { color = { background: '#ffb74d', border: '#fff3e0' }; size = origSize[n.id] + 6 }
        else color = DIM_NODE
      }

      return { id: n.id, hidden: false, label, color, size }
    })
    nodesDS.current.update(nodeUpdates)

    const edgeUpdates = data.edges.map((e) => {
      if (!isVisible(e.from) || !isVisible(e.to)) {
        return { id: e.id, hidden: true }
      }
      let color = e.color
      if (neigh) {
        color = neigh.has(e.from) && neigh.has(e.to) ? NEIGH_EDGE : DIM_EDGE
      } else if (dijkstraEdges) {
        color = dijkstraEdges.has(dirKey(e.from, e.to)) ? { color: '#ffb74d', opacity: 1 } : DIM_EDGE
      } else if (bfsLayers) {
        const on = bfsLayers[e.from] !== undefined && bfsLayers[e.to] !== undefined
        color = on ? { color: '#4fc3f7', opacity: 0.55 } : DIM_EDGE
      }
      return { id: e.id, hidden: false, color }
    })
    edgesDS.current.update(edgeUpdates)
  }, [data, meta, activeTiers, showAllLabels, selected, algoHighlight]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 select-none">
        <p className="text-base font-medium">Grafo NBA não carregado</p>
        <p className="text-sm text-center px-8">
          Verifique se <code className="text-slate-400">data/dataset_parte2/nba_graph_final.csv</code> existe
          e se o backend está em execução.
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
          tooltipElRef.current.style.left = ev.clientX + 16 + 'px'
          tooltipElRef.current.style.top = ev.clientY + 12 + 'px'
        }
      }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {tooltip && (
        <div
          ref={tooltipElRef}
          className="fixed z-50 pointer-events-none select-none rounded-lg px-3 py-2 text-xs shadow-xl leading-relaxed"
          style={{
            left: tooltipPosRef.current.x + 16,
            top: tooltipPosRef.current.y + 12,
            background: '#1a1a2a',
            border: '1px solid #2e2e42',
            color: '#e8e8f0',
            maxWidth: 280,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip }}
        />
      )}
    </div>
  )
})

export default NbaGraphViewer
