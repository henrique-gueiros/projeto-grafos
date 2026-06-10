import {
  forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

const DIM_OPACITY = 0.14
const DIM_EDGE = { color: '#1a1a28', opacity: 0.08 }
const NEIGH_EDGE = { color: '#4fc3f7', opacity: 0.9 }

function _hex2rgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function basketballSvg(hex) {
  const [r, g, b] = _hex2rgb(hex)
  const light = `rgb(${Math.min(255, Math.round(r + (255 - r) * 0.45))},${Math.min(255, Math.round(g + (255 - g) * 0.45))},${Math.min(255, Math.round(b + (255 - b) * 0.45))})`
  const dark  = `rgb(${Math.round(r * 0.50)},${Math.round(g * 0.50)},${Math.round(b * 0.50)})`
  const seam  = `rgb(${Math.round(r * 0.22)},${Math.round(g * 0.22)},${Math.round(b * 0.22)})`
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><radialGradient id="b" cx="38%" cy="30%" r="75%">` +
      `<stop offset="0%" stop-color="${light}"/>` +
      `<stop offset="55%" stop-color="${hex}"/>` +
      `<stop offset="100%" stop-color="${dark}"/>` +
      `</radialGradient></defs>` +
      `<circle cx="50" cy="50" r="49" fill="url(#b)"/>` +
      `<g stroke="${seam}" stroke-width="2.6" fill="none" stroke-linecap="round">` +
      `<line x1="50" y1="2" x2="50" y2="98"/>` +
      `<line x1="2" y1="50" x2="98" y2="50"/>` +
      `<path d="M17,11 C41,37 41,63 17,89"/>` +
      `<path d="M83,11 C59,37 59,63 83,89"/>` +
      `</g></svg>`,
    )
  )
}

function dirKey(a, b) {
  return `${a}>${b}`
}

function ringColor(c) {
  return {
    background: c,
    border: c,
    highlight: { background: c, border: '#ffffff' },
    hover: { background: c, border: '#ffffff' },
  }
}

const NbaGraphViewer = forwardRef(function NbaGraphViewer(
  {
    data,
    activeTiers = [],
    showAllLabels = false,
    animation = null, // { startNode, edges: [[from,to],...], accent }
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

  // adjacência (não-dirigida) + metadados originais por id
  const meta = useMemo(() => {
    if (!data) return null
    const adj = {}
    const tierById = {}
    const ringById = {}
    const imgById = {}
    const origSize = {}
    data.nodes.forEach((n) => {
      adj[n.id] = new Set()
      tierById[n.id] = n.tier
      const c = n.color?.background ?? '#fbbf24'
      ringById[n.id] = c
      imgById[n.id] = basketballSvg(c)
      origSize[n.id] = n.size
    })
    data.edges.forEach((e) => {
      adj[e.from]?.add(e.to)
      adj[e.to]?.add(e.from)
    })
    return { adj, tierById, ringById, imgById, origSize }
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

    const vNodes = new DataSet(
      data.nodes.map((n) => {
        const c = n.color?.background ?? '#fbbf24'
        const img = basketballSvg(c)
        return {
          id: n.id,
          label: n.label,
          playerName: n.playerName,
          defaultLabel: n.defaultLabel,
          tooltipHtml: n.tooltipHtml,
          group: n.group,
          tier: n.tier,
          tierLabel: n.tierLabel,
          out_degree: n.out_degree,
          in_degree: n.in_degree,
          best_partner: n.best_partner,
          best_partner_pts: n.best_partner_pts,
          font: n.font,
          shadow: n.shadow,
          size: n.size,
          shape: 'circularImage',
          image: img,
          brokenImage: img,
          color: ringColor(c),
          borderWidth: 3,
          borderWidthSelected: 5,
          opacity: 1,
        }
      }),
    )
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

  // ---- recomputar estilos (animação | filtro + labels + vizinhança) ----
  useEffect(() => {
    if (!nodesDS.current || !edgesDS.current || !data || !meta) return

    const { adj, tierById, ringById, imgById, origSize } = meta

    // ---- Modo animação: dim total + revelação progressiva do percurso ----
    if (animation) {
      const accent = animation.accent ?? '#ffb74d'
      const edges = animation.edges ?? []
      const revealedNodes = new Set(animation.startNode ? [animation.startNode] : [])
      const revealedEdges = new Set()
      for (let i = 0; i < Math.min(animStep, edges.length); i++) {
        const [a, b] = edges[i]
        revealedNodes.add(a); revealedNodes.add(b)
        revealedEdges.add(dirKey(a, b))
      }
      const newest = animStep > 0 && animStep <= edges.length ? edges[animStep - 1]?.[1] : animation.startNode

      nodesDS.current.update(data.nodes.map((n) => {
        const on = revealedNodes.has(n.id)
        const isNewest = n.id === newest
        return {
          id: n.id,
          hidden: false,
          label: showAllLabels ? n.playerName : n.defaultLabel,
          opacity: on ? 1 : 0.1,
          size: isNewest ? origSize[n.id] + 8 : on ? origSize[n.id] + 2 : origSize[n.id],
          image: imgById[n.id],
          color: isNewest ? ringColor(accent) : ringColor(ringById[n.id]),
        }
      }))
      edgesDS.current.update(data.edges.map((e) => {
        const on = revealedEdges.has(dirKey(e.from, e.to))
        return {
          id: e.id,
          hidden: false,
          color: on ? { color: accent, opacity: 1 } : { color: '#1a1a28', opacity: 0.05 },
          width: on ? 4 : 1,
        }
      }))
      return
    }

    const tierFilterOn = activeTiers.length > 0
    const isVisible = (id) => !tierFilterOn || activeTiers.includes(tierById[id])

    let neigh = null
    if (selected) {
      neigh = new Set(adj[selected] ?? [])
      neigh.add(selected)
    }

    const nodeUpdates = data.nodes.map((n) => {
      const label = showAllLabels ? n.playerName : n.defaultLabel
      const hidden = !isVisible(n.id)
      if (hidden) return { id: n.id, hidden: true, label }

      const color = ringColor(ringById[n.id])
      const opacity = neigh && !neigh.has(n.id) ? DIM_OPACITY : 1
      return { id: n.id, hidden: false, label, color, image: imgById[n.id], size: origSize[n.id], opacity }
    })
    nodesDS.current.update(nodeUpdates)

    const edgeUpdates = data.edges.map((e) => {
      if (!isVisible(e.from) || !isVisible(e.to)) {
        return { id: e.id, hidden: true }
      }
      let color = e.color
      if (neigh) {
        color = neigh.has(e.from) && neigh.has(e.to) ? NEIGH_EDGE : DIM_EDGE
      }
      return { id: e.id, hidden: false, color, width: e.width }
    })
    edgesDS.current.update(edgeUpdates)
  }, [data, meta, activeTiers, showAllLabels, selected, animation, animStep]) // eslint-disable-line react-hooks/exhaustive-deps

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
