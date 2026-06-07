/**
 * Constantes e helpers de percepção visual (Gestalt) para os grafos interativos.
 * Usado por GraphViewer e NbaGraphViewer.
 */

export const GESTALT = {
  DIM_NODE: 0.14,
  DIM_EDGE: 0.08,
  NEIGH_EDGE_OPACITY: 0.9,
  FOCUS_EDGE_OPACITY: 1,
  SELECTED_SCALE: 1.35,
  NEIGH_SCALE: 1.12,
  PATH_NODE_BOOST: 6,
  PATH_EDGE_WIDTH: 4,
}

export const REGION_ANCHORS = {
  Norte: { x: -280, y: -220 },
  Nordeste: { x: 280, y: -180 },
  Sudeste: { x: 320, y: 120 },
  Sul: { x: -120, y: 280 },
  'Centro-Oeste': { x: -320, y: 60 },
}

export const TIER_ANCHORS = {
  S: { x: 0, y: -200 },
  A: { x: 220, y: -60 },
  B: { x: 180, y: 160 },
  C: { x: -180, y: 140 },
  D: { x: -240, y: -80 },
}

export const BFS_LAYER_COLORS = [
  '#ffd54f', '#4fc3f7', '#81c784', '#ff8a65',
  '#b39ddb', '#f06292', '#4dd0e1', '#aed581',
]

export function scatterAroundAnchor(anchor, index, total, spread = 55) {
  if (total <= 1) return { x: anchor.x, y: anchor.y }
  const angle = (index / total) * Math.PI * 2 + (index % 3) * 0.4
  const ring = Math.floor(index / 6) + 1
  const r = spread * (0.35 + ring * 0.45)
  return {
    x: anchor.x + Math.cos(angle) * r,
    y: anchor.y + Math.sin(angle) * r,
  }
}

export function sizeByGrau(grau, min = 14, max = 42) {
  const g = Math.max(1, grau ?? 1)
  return Math.min(max, min + g * 2.2)
}

export function widthByWeight(weight, min = 1.2, max = 6) {
  const w = Math.max(0.5, weight ?? 1)
  return Math.min(max, min + w * 0.9)
}
