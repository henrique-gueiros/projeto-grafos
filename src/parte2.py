"""
Parte 2 — Rede de Assistências NBA.

Executa BFS, DFS, Dijkstra e Bellman-Ford sobre o grafo dirigido da NBA,
gera visualizações em out/ e grava out/parte2_report.json.
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np


# ---------------------------------------------------------------------------
# Utilitários internos
# ---------------------------------------------------------------------------

def _project_root(root: Path | None = None) -> Path:
    if root is not None:
        return root
    here = Path(__file__).resolve().parent
    while here != here.parent:
        if (here / "data").is_dir():
            return here
        here = here.parent
    raise RuntimeError("Raiz do projeto não encontrada")


def _out_dir(root: Path) -> Path:
    d = root / "out"
    d.mkdir(exist_ok=True)
    return d


# ---------------------------------------------------------------------------
# Estatísticas do grafo
# ---------------------------------------------------------------------------

def _compute_stats(g) -> dict:
    out_degrees = [g.out_degree(n) for n in g.nodes]
    in_degrees = [g.in_degree(n) for n in g.nodes]
    weights = [e.weight for e in g.edges()]
    n = g.num_nodes()
    m = g.num_edges()
    density = m / (n * (n - 1)) if n > 1 else 0.0
    return {
        "num_nodes": n,
        "num_edges": m,
        "density": round(density, 6),
        "out_degree": {
            "min": int(min(out_degrees)),
            "max": int(max(out_degrees)),
            "mean": round(sum(out_degrees) / n, 2),
        },
        "in_degree": {
            "min": int(min(in_degrees)),
            "max": int(max(in_degrees)),
            "mean": round(sum(in_degrees) / n, 2),
        },
        "weight": {
            "min": int(min(weights)),
            "max": int(max(weights)),
            "mean": round(sum(weights) / len(weights), 2),
        },
    }


# ---------------------------------------------------------------------------
# BFS
# ---------------------------------------------------------------------------

def _run_bfs(g, sources: list[str]) -> list[dict]:
    from src.graphs.digraph_algorithms import bfs_directed
    results = []
    for src in sources:
        t0 = time.perf_counter()
        order, layers, parent = bfs_directed(g, src)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        results.append({
            "source": src,
            "nodes_visited": len(order),
            "num_layers": len(layers),
            "layer_sizes": [len(l) for l in layers],
            "time_ms": round(elapsed_ms, 3),
        })
        print(
            f"  BFS {src!r:30s} -> {len(order):4d} nos, "
            f"{len(layers)} camadas, {elapsed_ms:.2f} ms"
        )
    return results


# ---------------------------------------------------------------------------
# DFS
# ---------------------------------------------------------------------------

def _run_dfs(g, sources: list[str]) -> list[dict]:
    from src.graphs.digraph_algorithms import dfs_directed
    results = []
    for src in sources:
        t0 = time.perf_counter()
        order, disc, fin, parent, edge_types, has_cycle = dfs_directed(g, src)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        counts = {"tree": 0, "back": 0, "forward": 0, "cross": 0}
        for etype in edge_types.values():
            counts[etype] += 1
        results.append({
            "source": src,
            "nodes_visited": len(order),
            "has_cycle": has_cycle,
            "edge_types": counts,
            "time_ms": round(elapsed_ms, 3),
        })
        print(
            f"  DFS {src!r:30s} -> {len(order):4d} nos, "
            f"ciclo={has_cycle}, back={counts['back']}, {elapsed_ms:.2f} ms"
        )
    return results


# ---------------------------------------------------------------------------
# Dijkstra
# ---------------------------------------------------------------------------

def _run_dijkstra(g, pairs: list[tuple[str, str]]) -> list[dict]:
    from src.graphs.digraph_algorithms import dijkstra_directed, reconstruir_caminho_di
    results = []
    for src, tgt in pairs:
        t0 = time.perf_counter()
        dist, prev = dijkstra_directed(g, src, target=tgt)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        cost = dist.get(tgt, float("inf"))
        path = reconstruir_caminho_di(prev, src, tgt) if cost < float("inf") else None
        results.append({
            "source": src,
            "target": tgt,
            "cost": round(cost, 6) if cost < float("inf") else None,
            "path": path,
            "path_len": len(path) if path else None,
            "time_ms": round(elapsed_ms, 3),
        })
        path_str = " -> ".join(path) if path else "sem caminho"
        print(
            f"  Dijkstra {src!r} -> {tgt!r}: custo={cost:.4f}, "
            f"{len(path) if path else 0} nos, {elapsed_ms:.2f} ms"
        )
        print(f"    {path_str}")
    return results


# ---------------------------------------------------------------------------
# Bellman-Ford
# ---------------------------------------------------------------------------

def _run_bellman_ford(g) -> list[dict]:
    from src.graphs.digraph_algorithms import bfs_directed, bellman_ford

    results = []

    # Caso 1: subgrafo árvore BFS de L. James → DAG, sem ciclo negativo
    print("  Bellman-Ford Caso 1: subgrafo L. James (sem ciclo negativo)...")
    src1 = "L. James"
    _, layers1, _ = bfs_directed(g, src1)
    bfs_nodes1: set[str] = set()
    for layer in layers1:
        bfs_nodes1.update(layer)
    sub1 = g.induced_subgraph(bfs_nodes1)

    def bf_weight(e):
        return e.cost - 0.05

    t0 = time.perf_counter()
    dist1, prev1, neg_cycle1, neg_nodes1 = bellman_ford(sub1, src1, weight_fn=bf_weight)
    elapsed1 = (time.perf_counter() - t0) * 1000

    results.append({
        "case": "sem_ciclo_negativo",
        "description": "Subgrafo BFS de L. James (árvore BFS = DAG)",
        "source": src1,
        "subgraph_nodes": sub1.num_nodes(),
        "subgraph_edges": sub1.num_edges(),
        "bf_weight_formula": "cost - 0.05",
        "has_negative_cycle": neg_cycle1,
        "neg_cycle_nodes": list(neg_nodes1),
        "time_ms": round(elapsed1, 3),
    })
    print(
        f"    {sub1.num_nodes()} nós, {sub1.num_edges()} arestas, "
        f"ciclo_neg={neg_cycle1}, {elapsed1:.2f} ms"
    )

    # Caso 2: vizinhança de Giannis → tem ciclo negativo Giannis ↔ B. Lopez
    print("  Bellman-Ford Caso 2: vizinhança Giannis (ciclo negativo)...")
    src2 = "G. Antetokounmpo"
    _, layers2, _ = bfs_directed(g, src2)
    # vizinhança = camada 0 + camada 1 (ego + vizinhos diretos)
    bfs_nodes2: set[str] = set()
    for layer in layers2[:2]:
        bfs_nodes2.update(layer)
    # também incluir vizinhos de entrada para fechar ciclos
    for nbr, _ in g.in_neighbors(src2):
        bfs_nodes2.add(nbr)
    sub2 = g.induced_subgraph(bfs_nodes2)

    t0 = time.perf_counter()
    dist2, prev2, neg_cycle2, neg_nodes2 = bellman_ford(sub2, src2, weight_fn=bf_weight)
    elapsed2 = (time.perf_counter() - t0) * 1000

    results.append({
        "case": "com_ciclo_negativo",
        "description": "Subgrafo vizinhança de G. Antetokounmpo (1-hop + back-edges)",
        "source": src2,
        "subgraph_nodes": sub2.num_nodes(),
        "subgraph_edges": sub2.num_edges(),
        "bf_weight_formula": "cost - 0.05",
        "has_negative_cycle": neg_cycle2,
        "neg_cycle_nodes": list(neg_nodes2)[:20],
        "time_ms": round(elapsed2, 3),
    })
    print(
        f"    {sub2.num_nodes()} nós, {sub2.num_edges()} arestas, "
        f"ciclo_neg={neg_cycle2}, nós_afetados={len(neg_nodes2)}, {elapsed2:.2f} ms"
    )

    return results


# ---------------------------------------------------------------------------
# Visualizações
# ---------------------------------------------------------------------------

DARK_BG = "#0f0f1a"
PANEL_BG = "#1a1a2a"
TEXT_COLOR = "#e0e0e0"
GRID_COLOR = "#2e2e42"

ALGO_COLORS = {
    "BFS": "#4fc3f7",
    "DFS": "#81c784",
    "Dijkstra": "#ffb74d",
    "Bellman-Ford": "#f06292",
}


def _style_ax(ax):
    ax.set_facecolor(PANEL_BG)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.xaxis.label.set_color(TEXT_COLOR)
    ax.yaxis.label.set_color(TEXT_COLOR)
    ax.title.set_color(TEXT_COLOR)
    for spine in ax.spines.values():
        spine.set_edgecolor(GRID_COLOR)
    ax.grid(color=GRID_COLOR, linestyle="--", linewidth=0.5, alpha=0.6)


def _viz_degree_distribution(g, out_path: Path) -> None:
    out_deg = sorted([g.out_degree(n) for n in g.nodes if g.out_degree(n) > 0])
    in_deg = sorted([g.in_degree(n) for n in g.nodes if g.in_degree(n) > 0])

    fig, axes = plt.subplots(1, 2, figsize=(12, 5), facecolor=DARK_BG)
    fig.suptitle("Distribuição de Graus — Rede NBA", color=TEXT_COLOR, fontsize=13)

    for ax, degrees, label, color in [
        (axes[0], out_deg, "Grau de Saída (out-degree)", "#4fc3f7"),
        (axes[1], in_deg, "Grau de Entrada (in-degree)", "#f06292"),
    ]:
        _style_ax(ax)
        counts = {}
        for d in degrees:
            counts[d] = counts.get(d, 0) + 1
        xs = list(counts.keys())
        ys = list(counts.values())
        ax.scatter(xs, ys, s=8, color=color, alpha=0.6)
        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.set_xlabel(label)
        ax.set_ylabel("Frequência")
        ax.set_title(f"{label}\n(excluindo grau=0)", fontsize=10)

    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")


def _viz_top_passadores(g, out_path: Path, top_n: int = 15) -> None:
    out_deg = sorted(
        [(n, g.out_degree(n)) for n in g.nodes],
        key=lambda x: -x[1],
    )[:top_n]

    labels = [x[0] for x in reversed(out_deg)]
    values = [x[1] for x in reversed(out_deg)]

    fig, ax = plt.subplots(figsize=(10, 6), facecolor=DARK_BG)
    _style_ax(ax)
    colors = plt.cm.YlOrRd(np.linspace(0.4, 0.9, len(labels)))
    ax.barh(labels, values, color=colors)
    ax.set_xlabel("Grau de Saída (nº de parceiros a quem assistiu)")
    ax.set_title(f"Top {top_n} Passadores — Rede NBA", color=TEXT_COLOR)
    for i, v in enumerate(values):
        ax.text(v + 2, i, str(v), va="center", color=TEXT_COLOR, fontsize=8)

    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")


def _viz_comparacao_algoritmos(bfs_res, dfs_res, dijkstra_res, bf_res, out_path: Path) -> None:
    labels = []
    times = []
    colors = []

    for r in bfs_res:
        labels.append(f"BFS\n{r['source'].split()[-1]}")
        times.append(r["time_ms"])
        colors.append(ALGO_COLORS["BFS"])

    for r in dfs_res:
        labels.append(f"DFS\n{r['source'].split()[-1]}")
        times.append(r["time_ms"])
        colors.append(ALGO_COLORS["DFS"])

    for r in dijkstra_res:
        lbl = f"Dijk\n{r['source'].split()[-1]}→{r['target'].split()[-1]}"
        labels.append(lbl)
        times.append(r["time_ms"])
        colors.append(ALGO_COLORS["Dijkstra"])

    for r in bf_res:
        case_lbl = "s/ciclo" if "sem" in r["case"] else "c/ciclo"
        labels.append(f"BF\n{case_lbl}")
        times.append(r["time_ms"])
        colors.append(ALGO_COLORS["Bellman-Ford"])

    fig, ax = plt.subplots(figsize=(14, 5), facecolor=DARK_BG)
    _style_ax(ax)
    xs = range(len(labels))
    ax.bar(xs, times, color=colors, alpha=0.85)
    ax.set_yscale("log")
    ax.set_xticks(list(xs))
    ax.set_xticklabels(labels, fontsize=7.5)
    ax.set_ylabel("Tempo (ms) — escala log")
    ax.set_title("Comparação de Desempenho dos Algoritmos", color=TEXT_COLOR)

    legend_patches = [
        mpatches.Patch(color=c, label=algo)
        for algo, c in ALGO_COLORS.items()
    ]
    ax.legend(handles=legend_patches, loc="upper left",
              facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR, fontsize=9)

    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")


def _viz_weight_distribution(g, out_path: Path) -> None:
    weights = sorted([e.weight for e in g.edges()])
    p50 = weights[int(len(weights) * 0.50)]
    p90 = weights[int(len(weights) * 0.90)]
    p99 = weights[int(len(weights) * 0.99)]

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=DARK_BG)
    _style_ax(ax)
    ax.hist(weights, bins=80, color="#4fc3f7", alpha=0.7, edgecolor=DARK_BG, linewidth=0.3)
    ax.set_yscale("log")
    ax.set_xscale("log")
    ax.set_xlabel("Weight (pontos gerados via assistência)")
    ax.set_ylabel("Frequência (log)")
    ax.set_title("Distribuição de Weights — Rede NBA", color=TEXT_COLOR)

    for pct, val, col in [(50, p50, "#ffb74d"), (90, p90, "#f06292"), (99, p99, "#ce93d8")]:
        ax.axvline(val, color=col, linestyle="--", linewidth=1.2,
                   label=f"P{pct}={int(val)}")

    ax.legend(facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")


def _viz_bfs_layers(bfs_res, out_path: Path) -> None:
    """Gráfico de barras empilhadas mostrando camadas BFS por fonte."""
    fig, ax = plt.subplots(figsize=(10, 5), facecolor=DARK_BG)
    _style_ax(ax)

    max_layers = max(len(r["layer_sizes"]) for r in bfs_res)
    palette = plt.cm.Blues(np.linspace(0.3, 0.9, max_layers))
    x = np.arange(len(bfs_res))
    bar_width = 0.5
    bottom = np.zeros(len(bfs_res))

    for layer_idx in range(max_layers):
        vals = []
        for r in bfs_res:
            sizes = r["layer_sizes"]
            vals.append(sizes[layer_idx] if layer_idx < len(sizes) else 0)
        ax.bar(x, vals, bar_width, bottom=bottom,
               color=palette[layer_idx], label=f"Camada {layer_idx}")
        bottom += np.array(vals)

    ax.set_xticks(x)
    ax.set_xticklabels([r["source"] for r in bfs_res], color=TEXT_COLOR, fontsize=9)
    ax.set_ylabel("Nós por camada")
    ax.set_title("Camadas BFS por Fonte", color=TEXT_COLOR)
    ax.legend(facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR, fontsize=8,
              loc="upper right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")


# ---------------------------------------------------------------------------
# HTML Interativo (amostra do grafo NBA)
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Rede NBA — Assistências | Grafo Interativo</title>
<script src="../lib/vis-9.1.2/vis-network.min.js"></script>
<link rel="stylesheet" href="../lib/vis-9.1.2/vis-network.css">
<link rel="stylesheet" href="../lib/tom-select/tom-select.css">
<script src="../lib/tom-select/tom-select.complete.min.js"></script>
<style>
:root{--bg-page:#0f0f1a;--bg-panel:rgba(26,26,42,0.97);--bg-sidebar:#1a1a2a;--bg-control:#242438;--bg-hover:#2e2e48;--border:#2e2e42;--text-primary:#e8e8f0;--text-secondary:#c8c8d8;--text-muted:#8a8a9a;--accent:#4fc3f7;--accent-soft:rgba(79,195,247,0.12);--shadow:0 4px 18px rgba(0,0,0,0.6)}
[data-theme=light]{--bg-page:#f0f2f8;--bg-panel:rgba(255,255,255,0.97);--bg-sidebar:#ffffff;--bg-control:#eef0f6;--bg-hover:#e2e5f0;--border:#d0d4e8;--text-primary:#1a1a2a;--text-secondary:#3a3a5a;--text-muted:#7a7a9a}
[data-theme=light] #mynetwork{background:#f0f2f8!important}
html,body{margin:0;padding:0;background:var(--bg-page);font-family:Arial,sans-serif;overflow:hidden;height:100vh;color:var(--text-primary)}
#mynetwork{position:fixed;inset:0;background:var(--bg-page)}
/* hamburger */
#btn-filtro-toggle{position:fixed;left:12px;top:12px;z-index:10001;width:40px;height:40px;padding:0;border:1px solid var(--border);border-radius:8px;background:var(--bg-sidebar);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;box-shadow:var(--shadow);transition:background .2s}
#btn-filtro-toggle:hover{background:var(--bg-hover)}
#btn-filtro-toggle span{display:block;width:18px;height:2px;background:var(--text-secondary);border-radius:1px}
/* sidebar */
#filtro-sidebar{position:fixed;left:0;top:0;height:100vh;width:340px;background:var(--bg-sidebar);border-right:1px solid var(--border);z-index:10000;transform:translateX(-100%);transition:transform .28s ease;box-shadow:4px 0 20px rgba(0,0,0,.45);display:flex;flex-direction:column}
#filtro-sidebar.open{transform:translateX(0)}
.sb-header{padding:14px 16px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.sb-header h2{margin:0;font-size:13px;color:var(--accent);font-weight:600}
.sb-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:4px;line-height:1}
.sb-close:hover{background:var(--bg-hover)}
.sb-body{flex:1;overflow-y:auto;padding:12px 14px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.sb-section{margin-bottom:18px}
.sb-section h3{margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)}
#filter-stats{font-size:11px;color:var(--text-secondary);margin:0 0 14px;padding:8px 10px;background:var(--bg-control);border-radius:6px;border:1px solid var(--border)}
#filter-stats span{color:var(--accent);font-weight:600}
/* chips */
.filtro-chips{display:flex;flex-direction:column;gap:5px}
.filtro-chip{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg-control);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);cursor:pointer;font-size:11px;transition:background .15s,border-color .15s;text-align:left;width:100%}
.filtro-chip:hover{background:var(--bg-hover)}
.filtro-chip[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.chip-dot{width:10px;height:10px;border-radius:50%;background:var(--rc,#888);flex-shrink:0;border:1px solid rgba(255,255,255,.2)}
/* toggle */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0}
.toggle-row label:first-child{font-size:11px;color:var(--text-secondary)}
.tgl{position:relative;width:36px;height:20px;flex-shrink:0}
.tgl input{opacity:0;width:0;height:0;position:absolute}
.tgl-track{position:absolute;inset:0;background:var(--bg-control);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:background .2s}
.tgl input:checked+.tgl-track{background:var(--accent);border-color:var(--accent)}
.tgl-thumb{position:absolute;top:3px;left:3px;width:12px;height:12px;background:#fff;border-radius:50%;transition:transform .2s;pointer-events:none}
.tgl input:checked~.tgl-thumb{transform:translateX(16px)}
/* reset */
.btn-limpar{width:100%;padding:8px;background:var(--bg-control);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);cursor:pointer;font-size:12px;transition:background .15s;margin-top:4px}
.btn-limpar:hover{background:var(--bg-hover)}
/* legend */
#leg{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:1000;background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:14px 16px;box-shadow:var(--shadow);min-width:168px}
#leg h3{margin:0 0 4px;font-size:12px;color:var(--text-primary);font-weight:600}
.leg-sub{font-size:10px;color:var(--text-muted);margin:0 0 10px}
.leg-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;border:1px solid rgba(255,255,255,.2)}
.leg-row span{font-size:11px;color:var(--text-secondary)}
.leg-sep{border:none;border-top:1px solid var(--border);margin:10px 0}
.leg-hint{font-size:10px;color:var(--text-muted);margin:0;line-height:1.5}
/* controls */
#graph-controls{position:fixed;bottom:16px;right:16px;z-index:1000;display:flex;flex-direction:column;gap:6px}
.gctrl{background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);cursor:pointer;padding:7px 14px;font-size:12px;box-shadow:var(--shadow);transition:background .15s}
.gctrl:hover{background:var(--bg-hover)}
/* toolbar */
#top-toolbar{position:fixed;right:14px;top:12px;z-index:1000;display:flex;gap:6px}
.tbtn{background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);cursor:pointer;padding:6px 12px;font-size:11px;box-shadow:var(--shadow);transition:background .15s}
.tbtn:hover{background:var(--bg-hover)}
/* tooltip */
#grafo-tooltip{position:fixed;z-index:99999;display:none;background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text-primary);box-shadow:var(--shadow);pointer-events:none;max-width:260px;line-height:1.6}
#grafo-tooltip b{color:var(--accent)}
/* node info panel */
#node-info{position:fixed;left:14px;bottom:14px;z-index:1000;background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--text-secondary);box-shadow:var(--shadow);min-width:200px;max-width:290px;display:none;line-height:1.6}
#node-info b{color:var(--accent)}
/* tom-select overrides */
.ts-control{background:var(--bg-control)!important;border:1px solid var(--border)!important;border-radius:6px!important;color:var(--text-primary)!important;font-size:12px!important;min-height:34px}
.ts-control input{color:var(--text-primary)!important}
.ts-control input::placeholder{color:var(--text-muted)!important}
.ts-dropdown{background:var(--bg-sidebar)!important;border:1px solid var(--border)!important;color:var(--text-secondary)!important;font-size:12px!important;z-index:20000!important}
.ts-dropdown .option:hover,.ts-dropdown .option.active{background:var(--bg-hover)!important;color:var(--text-primary)!important}
.ts-dropdown .option.selected{background:var(--accent-soft)!important;color:var(--accent)!important}
.ts-wrapper .ts-control .item{background:var(--accent-soft);color:var(--accent);border-radius:4px;padding:1px 6px}
.vis-tooltip{display:none!important}
</style>
</head>
<body>

<button id="btn-filtro-toggle" aria-label="Abrir painel de filtros">
  <span></span><span></span><span></span>
</button>

<div id="filtro-sidebar">
  <div class="sb-header">
    <h2>&#127936;&nbsp;Rede NBA — Filtros</h2>
    <button class="sb-close" id="btn-sb-close" title="Fechar">&#10005;</button>
  </div>
  <div class="sb-body">
    <p id="filter-stats">Mostrando <span id="stat-nodes">___NODES_COUNT___</span> jogadores · <span id="stat-edges">___EDGES_COUNT___</span> assistências</p>

    <div class="sb-section">
      <h3>Buscar jogador</h3>
      <select id="player-search" placeholder="Digite um nome…"></select>
    </div>

    <div class="sb-section">
      <h3>Filtrar por tier</h3>
      <div class="filtro-chips" id="filtro-tiers">___TIER_CHIPS___</div>
    </div>

    <div class="sb-section">
      <h3>Exibição</h3>
      <div class="toggle-row">
        <label for="tgl-labels">Mostrar todos os rótulos</label>
        <label class="tgl">
          <input type="checkbox" id="tgl-labels">
          <span class="tgl-track"></span>
          <span class="tgl-thumb"></span>
        </label>
      </div>
    </div>

    <button class="btn-limpar" id="btn-limpar">&#10227;&nbsp;Limpar / Mostrar tudo</button>
  </div>
</div>

<div id="mynetwork"></div>

<div id="leg">
  <h3>&#9752; Rede de Assistências NBA</h3>
  <p class="leg-sub">Tier por grau total (saída + entrada)</p>
  ___LEG_ITEMS___
  <hr class="leg-sep">
  <div class="leg-row">
    <svg width="30" height="10" style="flex-shrink:0"><defs><marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#4fc3f7"/></marker></defs><line x1="2" y1="5" x2="23" y2="5" stroke="#4fc3f7" stroke-width="2" marker-end="url(#arr)"/></svg>
    <span>Direção da assistência</span>
  </div>
  <div class="leg-row" style="margin-top:4px">
    <svg width="30" height="10" style="flex-shrink:0"><line x1="2" y1="5" x2="25" y2="5" stroke="#4fc3f7" stroke-width="4" opacity=".5"/></svg>
    <span>Espessura = pontos gerados</span>
  </div>
  <hr class="leg-sep">
  <p class="leg-hint">Clique num nó para ver vizinhança.<br>&#9776; à esquerda para filtros.<br><b>0</b> centraliza · <b>Espaço</b> pausa física.</p>
</div>

<div id="top-toolbar">
  <button class="tbtn" id="btn-theme">&#9790; Tema</button>
</div>

<div id="graph-controls">
  <button class="gctrl" id="btn-fit">&#8982; Centralizar</button>
  <button class="gctrl" id="btn-physics">&#10074;&#10074; Pausar</button>
</div>

<div id="node-info"></div>
<div id="grafo-tooltip" role="tooltip"></div>

<script>
// ============================================================
// Data injetado pelo Python
// ============================================================
var nodesData = ___NODES_JSON___;
var edgesData = ___EDGES_JSON___;
var tomOptions = ___TOM_OPTIONS___;

// ============================================================
// Inicializar grafo
// ============================================================
var nodes = new vis.DataSet(nodesData);
var edges = new vis.DataSet(edgesData);
var container = document.getElementById("mynetwork");

var options = {
  physics: {
    solver: "forceAtlas2Based",
    forceAtlas2Based: {
      gravitationalConstant: -80,
      centralGravity: 0.005,
      springLength: 160,
      springConstant: 0.05,
      damping: 0.45
    },
    stabilization: { iterations: 300, fit: true }
  },
  interaction: {
    hover: true,
    tooltipDelay: 9999999,
    navigationButtons: false,
    keyboard: { enabled: true, bindToWindow: false }
  },
  nodes: {
    scaling: { min: 8, max: 45, label: { enabled: true, min: 10, max: 20, drawThreshold: 8 } }
  },
  edges: {
    smooth: { type: "curvedCW", roundness: 0.12 },
    scaling: { min: 1, max: 7 }
  }
};

var network = new vis.Network(container, { nodes: nodes, edges: edges }, options);

// guardar cores originais
var nodeColors = {};
nodes.get().forEach(function(n) { nodeColors[n.id] = JSON.parse(JSON.stringify(n.color)); });

// ============================================================
// Highlight de vizinhança ao clicar
// ============================================================
var highlightActive = false;

network.on("click", function(params) {
  var panel = document.getElementById("node-info");
  if (params.nodes.length > 0) {
    highlightActive = true;
    var sel = params.nodes[0];
    var connected = new Set(network.getConnectedNodes(sel));
    connected.add(sel);

    nodes.update(nodes.get().map(function(n) {
      return connected.has(n.id)
        ? { id: n.id, color: nodeColors[n.id], opacity: 1.0 }
        : { id: n.id, color: { background: "rgba(40,40,55,0.3)", border: "rgba(60,60,80,0.3)" }, opacity: 0.25 };
    }));

    edges.update(edges.get().map(function(e) {
      var on = connected.has(e.from) && connected.has(e.to);
      return { id: e.id, color: on ? { color: "#4fc3f7", opacity: 0.9 } : { color: "#1a1a28", opacity: 0.1 } };
    }));

    var nd = nodes.get(sel);
    panel.style.display = "block";
    panel.innerHTML = nd && nd.tooltipHtml ? nd.tooltipHtml : "<b>" + sel + "</b>";
  } else {
    _reset();
    panel.style.display = "none";
  }
});

function _reset() {
  highlightActive = false;
  nodes.update(nodes.get().map(function(n) {
    return { id: n.id, color: nodeColors[n.id], opacity: 1.0 };
  }));
  edges.update(edges.get().map(function(e) {
    return { id: e.id, color: { color: "#3a3a5e", highlight: "#4fc3f7", hover: "#6868aa", opacity: 0.65 } };
  }));
}

// ============================================================
// Tooltip customizado (não o nativo do vis.js)
// ============================================================
(function() {
  var tip = document.getElementById("grafo-tooltip");
  var active = null;

  function pxy(p) {
    var e = p && (p.event || p.srcEvent || p);
    if (e && e.clientX != null) return { x: e.clientX + 16, y: e.clientY + 12 };
    if (p && p.pointer && p.pointer.DOM) {
      var r = container.getBoundingClientRect();
      return { x: r.left + p.pointer.DOM.x + 16, y: r.top + p.pointer.DOM.y + 12 };
    }
    return null;
  }

  function show(html, evt) {
    if (!html) return;
    active = html; tip.innerHTML = html; tip.style.display = "block";
    var c = pxy(evt); if (c) { tip.style.left = c.x + "px"; tip.style.top = c.y + "px"; }
  }
  function move(evt) {
    if (!active) return;
    var c = pxy(evt); if (c) { tip.style.left = c.x + "px"; tip.style.top = c.y + "px"; }
  }
  function hide() { active = null; tip.style.display = "none"; tip.innerHTML = ""; }

  network.on("hoverNode", function(p) { var n = nodes.get(p.node); show(n && n.tooltipHtml, p); });
  network.on("blurNode", hide);
  network.on("hoverEdge", function(p) { var e = edges.get(p.edge); show(e && e.tooltipHtml, p); });
  network.on("blurEdge", hide);
  network.on("dragStart", hide);
  network.on("zoom", hide);
  container.addEventListener("mousemove", move);
})();

// ============================================================
// Sidebar
// ============================================================
var sidebar = document.getElementById("filtro-sidebar");
document.getElementById("btn-filtro-toggle").addEventListener("click", function() { sidebar.classList.toggle("open"); });
document.getElementById("btn-sb-close").addEventListener("click", function() { sidebar.classList.remove("open"); });

// ============================================================
// Filtro por tier
// ============================================================
var activeTiers = new Set();

document.querySelectorAll(".filtro-chip[data-tier]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var t = this.dataset.tier;
    var on = this.getAttribute("aria-pressed") === "true";
    this.setAttribute("aria-pressed", on ? "false" : "true");
    if (on) activeTiers.delete(t); else activeTiers.add(t);
    _applyFilters();
  });
});

function _applyFilters() {
  var visN = new Set();
  if (activeTiers.size === 0) {
    nodes.update(nodes.get().map(function(n) { visN.add(n.id); return { id: n.id, hidden: false }; }));
  } else {
    nodes.update(nodes.get().map(function(n) {
      var show = activeTiers.has(n.tier);
      if (show) visN.add(n.id);
      return { id: n.id, hidden: !show };
    }));
  }
  edges.update(edges.get().map(function(e) {
    return { id: e.id, hidden: activeTiers.size > 0 && !(visN.has(e.from) && visN.has(e.to)) };
  }));
  _stats();
}

function _stats() {
  var vn = nodes.get({ filter: function(n) { return !n.hidden; } }).length;
  var ve = edges.get({ filter: function(e) { return !e.hidden; } }).length;
  document.getElementById("stat-nodes").textContent = vn;
  document.getElementById("stat-edges").textContent = ve;
}

// ============================================================
// Tom Select
// ============================================================
var tomSel = new TomSelect("#player-search", {
  options: tomOptions,
  valueField: "value",
  labelField: "text",
  searchField: ["text"],
  maxItems: 1,
  placeholder: "Digite o nome de um jogador…",
  closeAfterSelect: true,
  onChange: function(val) {
    if (!val) return;
    network.focus(val, { scale: 2.2, animation: { duration: 700 } });
    var connected = new Set(network.getConnectedNodes(val));
    connected.add(val);
    nodes.update(nodes.get().map(function(n) {
      return connected.has(n.id)
        ? { id: n.id, color: nodeColors[n.id], opacity: 1.0 }
        : { id: n.id, color: { background: "rgba(40,40,55,0.3)", border: "rgba(60,60,80,0.3)" }, opacity: 0.25 };
    }));
    edges.update(edges.get().map(function(e) {
      var on = connected.has(e.from) && connected.has(e.to);
      return { id: e.id, color: on ? { color: "#4fc3f7", opacity: 0.9 } : { color: "#1a1a28", opacity: 0.1 } };
    }));
    var nd = nodes.get(val);
    var panel = document.getElementById("node-info");
    panel.style.display = "block";
    panel.innerHTML = nd && nd.tooltipHtml ? nd.tooltipHtml : "<b>" + val + "</b>";
    highlightActive = true;
  }
});

// ============================================================
// Toggle rótulos
// ============================================================
document.getElementById("tgl-labels").addEventListener("change", function() {
  var show = this.checked;
  nodes.update(nodes.get().map(function(n) {
    return { id: n.id, label: show ? n.playerName : n.defaultLabel };
  }));
});

// ============================================================
// Limpar tudo
// ============================================================
document.getElementById("btn-limpar").addEventListener("click", function() {
  activeTiers.clear();
  document.querySelectorAll(".filtro-chip[data-tier]").forEach(function(b) { b.setAttribute("aria-pressed","false"); });
  _reset();
  nodes.update(nodes.get().map(function(n) { return { id: n.id, hidden: false }; }));
  edges.update(edges.get().map(function(e) { return { id: e.id, hidden: false }; }));
  network.fit({ animation: { duration: 500 } });
  document.getElementById("node-info").style.display = "none";
  if (tomSel) { tomSel.clear(true); }
  document.getElementById("tgl-labels").checked = false;
  nodes.update(nodes.get().map(function(n) { return { id: n.id, label: n.defaultLabel }; }));
  _stats();
});

// ============================================================
// Controles do grafo
// ============================================================
document.getElementById("btn-fit").addEventListener("click", function() {
  network.fit({ animation: { duration: 600 } });
});

var physOn = true;
document.getElementById("btn-physics").addEventListener("click", function() {
  physOn = !physOn;
  network.setOptions({ physics: { enabled: physOn } });
  this.innerHTML = physOn ? "&#10074;&#10074; Pausar" : "&#9654; Retomar";
});

// teclado
document.addEventListener("keydown", function(e) {
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT")) return;
  if (e.key === " " || e.code === "Space") { e.preventDefault(); document.getElementById("btn-physics").click(); }
  if (e.key === "0") network.fit({ animation: { duration: 600 } });
  if (e.key === "Escape") { _reset(); document.getElementById("node-info").style.display = "none"; }
});

// ============================================================
// Tema claro/escuro
// ============================================================
document.getElementById("btn-theme").addEventListener("click", function() {
  var isLight = document.documentElement.getAttribute("data-theme") === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "" : "light");
  try { localStorage.setItem("nba-theme", isLight ? "" : "light"); } catch(e) {}
});
try { var _t = localStorage.getItem("nba-theme"); if (_t === "light") document.documentElement.setAttribute("data-theme","light"); } catch(e) {}

// init stats
_stats();
</script>
</body>
</html>"""


# Tiers por grau total (saída + entrada) — compartilhado entre HTML e API
TIER_COLORS = {
    "S": "#ffd54f",
    "A": "#ff8a65",
    "B": "#4fc3f7",
    "C": "#81c784",
    "D": "#b39ddb",
}
TIER_LABELS = {
    "S": "Lenda (total ≥ 200)",
    "A": "Elite (100–199)",
    "B": "Alto (50–99)",
    "C": "Médio (20–49)",
    "D": "Base (< 20)",
}

# Estrelas-âncora do subgrafo interativo (união dos 1-hop BFS)
NBA_SAMPLE_STARS = ["G. Antetokounmpo", "T. Young", "G. Hill"]


def _tier_for(total: int) -> str:
    if total >= 200: return "S"
    if total >= 100: return "A"
    if total >= 50:  return "B"
    if total >= 20:  return "C"
    return "D"


def build_nba_sample(g) -> dict:
    """
    Constrói o subgrafo interativo da rede NBA (mesma amostra do HTML):
    união dos 1-hop BFS de G. Antetokounmpo, T. Young e G. Hill
    (≈163 nós conectados, ≈382 arestas reais).

    Retorna um dicionário JSON-serializável com `nodes` e `edges` no formato
    vis.js (incluindo tooltipHtml, tier, métricas) além de metadados de tier.
    Usado tanto pelo gerador de HTML quanto pela API React.
    """
    from src.graphs.digraph_algorithms import bfs_directed

    # ---- Selecionar subgrafo: 1-hop de 3 estrelas principais ----
    nodes_set: set[str] = set()
    for s in NBA_SAMPLE_STARS:
        _, layers, _ = bfs_directed(g, s)
        for layer in layers[:2]:
            nodes_set.update(layer)

    # Arestas entre os nós selecionados
    sample_edges = [
        e for e in g.edges()
        if e.source in nodes_set and e.target in nodes_set
    ]

    # ---- Métricas por nó ----
    out_deg = {n: g.out_degree(n) for n in nodes_set}
    in_deg = {n: g.in_degree(n) for n in nodes_set}

    # Melhor parceria de cada nó (maior weight de aresta de saída)
    best_w: dict[str, float] = {}
    best_partner: dict[str, str] = {}
    for e in g.edges():
        if e.source in nodes_set:
            if e.weight > best_w.get(e.source, 0):
                best_w[e.source] = e.weight
                best_partner[e.source] = e.target

    def get_tier(n: str) -> str:
        return _tier_for(out_deg[n] + in_deg[n])

    max_od = max(out_deg.values()) if out_deg else 1

    # ---- Construir dados de nós para vis.js ----
    nodes_js = []
    for n in sorted(nodes_set):
        od = out_deg[n]
        id_ = in_deg[n]
        tier = get_tier(n)
        color = TIER_COLORS[tier]
        size = max(8, min(45, 8 + int((od / max_od) ** 0.5 * 37)))
        # label padrão: mostrar apenas para nós com grau de saída >= 10
        default_label = n if od >= 10 else ""
        bp = best_partner.get(n)
        bw = int(best_w.get(n, 0))
        tooltip = (
            f"<b style='font-size:14px'>{n}</b><br>"
            f"<b>Grau saída:</b> {od} | <b>Grau entrada:</b> {id_}<br>"
            f"<b>Tier:</b> {TIER_LABELS[tier]}"
            + (f"<br><b>Melhor parceria:</b> {bp} ({bw} pts)" if bp else "")
        )
        nodes_js.append({
            "id": n,
            "label": default_label,
            "playerName": n,          # nome completo, sempre disponível no JS
            "defaultLabel": default_label,
            "tooltipHtml": tooltip,
            "group": tier,
            "tier": tier,
            "tierLabel": TIER_LABELS[tier],
            "size": size,
            "value": od + id_,        # para scaling automático
            "out_degree": od,
            "in_degree": id_,
            "best_partner": bp,
            "best_partner_pts": bw,
            "color": {
                "background": color,
                "border": "#0f0f1a",
                "highlight": {"background": "#ffffff", "border": "#ffde00"},
                "hover":     {"background": color,    "border": "#ffffff"},
            },
            "font": {
                "color": "#e8e8f0",
                "size": max(10, min(18, 10 + int((od / max_od) ** 0.5 * 8))),
                "face": "Arial",
                "strokeWidth": 3,
                "strokeColor": "#0a0a12",
            },
            "borderWidth": 1.5,
            "shadow": {"enabled": True, "color": "rgba(0,0,0,0.4)", "size": 6, "x": 0, "y": 2},
        })

    # ---- Construir dados de arestas ----
    max_w_edge = max((e.weight for e in sample_edges), default=1.0)
    edges_js = []
    for i, e in enumerate(sample_edges):
        w_norm = max(1, min(7, int((e.weight / max_w_edge) ** 0.5 * 7)))
        tooltip = (
            f"<b>{e.source}</b> &rarr; <b>{e.target}</b><br>"
            f"<b>Pontos gerados:</b> {int(e.weight)}<br>"
            f"<b>Custo (1/w):</b> {e.cost:.4f}"
        )
        edges_js.append({
            "id": i,
            "from": e.source,
            "to": e.target,
            "value": e.weight,        # para scaling automático
            "width": w_norm,
            "weight": int(e.weight),
            "cost": round(e.cost, 6),
            "tooltipHtml": tooltip,
            "color": {"color": "#3a3a5e", "highlight": "#4fc3f7", "hover": "#6868aa", "opacity": 0.65},
            "arrows": {"to": {"enabled": True, "scaleFactor": 0.45, "type": "arrow"}},
        })

    tiers_meta = [
        {
            "tier": t,
            "label": TIER_LABELS[t],
            "color": TIER_COLORS[t],
            "count": sum(1 for n in nodes_set if get_tier(n) == t),
        }
        for t in ["S", "A", "B", "C", "D"]
    ]

    return {
        "stars": list(NBA_SAMPLE_STARS),
        "num_nodes": len(nodes_set),
        "num_edges": len(sample_edges),
        "nodes": nodes_js,
        "edges": edges_js,
        "tiers": tiers_meta,
    }


def _gerar_html_interativo(g, out_path: Path) -> None:
    """
    Gera visualização interativa vis.js da rede NBA a partir de build_nba_sample.
    """
    sample = build_nba_sample(g)

    nodes_json_str = json.dumps(sample["nodes"], ensure_ascii=False)
    edges_json_str = json.dumps(sample["edges"], ensure_ascii=False)

    # ---- Tier filter chips ----
    tier_chips = ""
    for tier in sample["tiers"]:
        tier_chips += (
            f'<button type="button" class="filtro-chip" data-tier="{tier["tier"]}" '
            f'aria-pressed="false" style="--rc:{tier["color"]}">'
            f'<span class="chip-dot"></span>{tier["label"]} ({tier["count"]})</button>'
        )

    # ---- Legenda ----
    leg_items = "".join(
        f'<div class="leg-row"><div class="dot" style="background:{tier["color"]}"></div>'
        f'<span>{tier["label"]}</span></div>'
        for tier in sample["tiers"]
    )

    # ---- Tom Select options ----
    tom_options_json = json.dumps(
        [{"value": n["id"], "text": n["id"]} for n in sample["nodes"]],
        ensure_ascii=False
    )

    # ---- Montar HTML via template ----
    html = (
        _HTML_TEMPLATE
        .replace("___NODES_JSON___", nodes_json_str)
        .replace("___EDGES_JSON___", edges_json_str)
        .replace("___TIER_CHIPS___", tier_chips)
        .replace("___LEG_ITEMS___", leg_items)
        .replace("___TOM_OPTIONS___", tom_options_json)
        .replace("___NODES_COUNT___", str(sample["num_nodes"]))
        .replace("___EDGES_COUNT___", str(sample["num_edges"]))
    )

    out_path.write_text(html, encoding="utf-8")
    print(f"  Salvo: {out_path}")


# ---------------------------------------------------------------------------
# Ponto de entrada
# ---------------------------------------------------------------------------

def solve_parte2(root: Path | None = None, verbose: bool = True) -> None:
    from src.graphs.digraph import digraph_from_csv

    root = _project_root(root)
    out = _out_dir(root)
    csv_path = root / "data" / "dataset_parte2" / "nba_graph_final.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset não encontrado: {csv_path}")

    # 1. Carregar grafo
    if verbose:
        print("Carregando grafo NBA...")
    t0 = time.perf_counter()
    g = digraph_from_csv(csv_path)
    load_time = (time.perf_counter() - t0) * 1000
    if verbose:
        print(f"  {g.num_nodes()} nós, {g.num_edges()} arestas em {load_time:.0f} ms")

    # 2. Estatísticas
    stats = _compute_stats(g)
    if verbose:
        print(f"  Densidade: {stats['density']}")
        print(f"  Out-degree: min={stats['out_degree']['min']} max={stats['out_degree']['max']} "
              f"média={stats['out_degree']['mean']}")

    # 3. Algoritmos
    sources_bfs = ["G. Antetokounmpo", "T. Young", "L. James"]
    sources_dfs = ["G. Antetokounmpo", "T. Young", "L. James"]
    dijkstra_pairs = [
        ("G. Antetokounmpo", "T. Young"),
        ("G. Antetokounmpo", "L. James"),
        ("G. Antetokounmpo", "B. Simmons"),
        ("T. Young", "B. Lopez"),
        ("T. Young", "D. Lillard"),
    ]

    if verbose:
        print("\nExecutando BFS...")
    bfs_results = _run_bfs(g, sources_bfs)

    if verbose:
        print("\nExecutando DFS...")
    dfs_results = _run_dfs(g, sources_dfs)

    if verbose:
        print("\nExecutando Dijkstra...")
    dijkstra_results = _run_dijkstra(g, dijkstra_pairs)

    if verbose:
        print("\nExecutando Bellman-Ford...")
    bf_results = _run_bellman_ford(g)

    # 4. Visualizações
    if verbose:
        print("\nGerando visualizações...")

    _viz_degree_distribution(g, out / "parte2_distribuicao_graus.png")
    _viz_top_passadores(g, out / "parte2_top_passadores.png")
    _viz_comparacao_algoritmos(
        bfs_results, dfs_results, dijkstra_results, bf_results,
        out / "parte2_comparacao_algoritmos.png",
    )
    _viz_weight_distribution(g, out / "parte2_distribuicao_pesos.png")
    _viz_bfs_layers(bfs_results, out / "parte2_bfs_camadas.png")

    # 5. HTML Interativo
    if verbose:
        print("\nGerando HTML interativo...")
    _gerar_html_interativo(g, out / "grafo_nba_interativo.html")

    # 6. Relatório JSON
    report = {
        "dataset": str(csv_path),
        "graph_stats": stats,
        "bfs": bfs_results,
        "dfs": dfs_results,
        "dijkstra": dijkstra_results,
        "bellman_ford": bf_results,
    }
    report_path = out / "parte2_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    if verbose:
        print(f"\nRelatório salvo: {report_path}")
        print("\nParte 2 concluída.")
