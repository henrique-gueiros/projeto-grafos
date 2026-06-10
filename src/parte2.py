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

                                                                             
              
                                                                             

def _run_bellman_ford(g) -> list[dict]:
    from src.graphs.digraph_algorithms import bfs_directed, bellman_ford

    results = []

                                                                       
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

                                                                           
    print("  Bellman-Ford Caso 2: vizinhança Giannis (ciclo negativo)...")
    src2 = "G. Antetokounmpo"
    _, layers2, _ = bfs_directed(g, src2)
                                                               
    bfs_nodes2: set[str] = set()
    for layer in layers2[:2]:
        bfs_nodes2.update(layer)
                                                           
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

                                                                             
               
                                                                             

DARK_BG  = "#0d0d18"
PANEL_BG = "#16162a"
TEXT_COLOR  = "#dde1f0"
MUTED_COLOR = "#6b7194"
GRID_COLOR  = "#252540"

ALGO_COLORS = {
    "BFS":          "#38bdf8",
    "DFS":          "#34d399",
    "Dijkstra":     "#fbbf24",
    "Bellman-Ford": "#f87171",
}
COLOR_OUT    = "#fbbf24"
COLOR_IN     = "#38bdf8"
COLOR_WEIGHT = "#a78bfa"

COLOR_P50 = "#34d399"
COLOR_P90 = "#fbbf24"
COLOR_P99 = "#f87171"

def _style_ax(ax):
    ax.set_facecolor(PANEL_BG)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.xaxis.label.set_color(TEXT_COLOR)
    ax.yaxis.label.set_color(TEXT_COLOR)
    ax.title.set_color(TEXT_COLOR)
    for spine in ax.spines.values():
        spine.set_edgecolor(GRID_COLOR)
    ax.grid(color=GRID_COLOR, linestyle="--", linewidth=0.4, alpha=0.7)

def _viz_degree_distribution(g, out_path: Path) -> None:
    out_deg = sorted([g.out_degree(n) for n in g.nodes if g.out_degree(n) > 0])
    in_deg  = sorted([g.in_degree(n)  for n in g.nodes if g.in_degree(n)  > 0])

    fig, axes = plt.subplots(1, 2, figsize=(12, 5), facecolor=DARK_BG)
    fig.suptitle("Distribuição de Graus — Rede NBA", color=TEXT_COLOR, fontsize=13, y=1.01)

    for ax, degrees, label, color in [
        (axes[0], out_deg, "Grau de Saída (out-degree)",   COLOR_OUT),
        (axes[1], in_deg,  "Grau de Entrada (in-degree)", COLOR_IN),
    ]:
        _style_ax(ax)
        counts: dict[int, int] = {}
        for d in degrees:
            counts[d] = counts.get(d, 0) + 1
        xs = list(counts.keys())
        ys = list(counts.values())
        max_y = max(ys)
        sizes = [max(4, min(60, 4 + int((y / max_y) ** 0.4 * 56))) for y in ys]
        ax.scatter(xs, ys, s=sizes, color=color, alpha=0.65, edgecolors="none")
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
    n = len(values)
    max_v = values[-1]

    bar_alphas  = [0.45 + 0.55 * (i / (n - 1)) for i in range(n)]
    bar_colors  = [(251/255, 191/255, 36/255, a) for a in bar_alphas]

    fig, ax = plt.subplots(figsize=(10, 6), facecolor=DARK_BG)
    _style_ax(ax)
    bars = ax.barh(labels, values, color=bar_colors, height=0.65)

    bars[-1].set_edgecolor("#ffffff")
    bars[-1].set_linewidth(1.2)

    ax.set_xlabel("Grau de Saída (nº de parceiros a quem assistiu)")
    ax.set_title(f"Top {top_n} Passadores — Rede NBA", color=TEXT_COLOR)

    for i, (bar, v) in enumerate(zip(bars, values)):
        txt_color = "#ffffff" if i == n - 1 else TEXT_COLOR
        ax.text(v + max_v * 0.01, bar.get_y() + bar.get_height() / 2,
                str(v), va="center", color=txt_color,
                fontsize=9 if i == n - 1 else 8,
                fontweight="bold" if i == n - 1 else "normal")

    ax.set_xlim(0, max_v * 1.12)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")

def _viz_comparacao_algoritmos(bfs_res, dfs_res, dijkstra_res, bf_res, out_path: Path) -> None:
    groups = [
        ("BFS",          bfs_res,      [f"BFS\n{r['source'].split()[-1]}"                         for r in bfs_res],      [r["time_ms"] for r in bfs_res]),
        ("DFS",          dfs_res,      [f"DFS\n{r['source'].split()[-1]}"                         for r in dfs_res],      [r["time_ms"] for r in dfs_res]),
        ("Dijkstra",     dijkstra_res, [f"Dijk\n{r['source'].split()[-1]}→{r['target'].split()[-1]}" for r in dijkstra_res], [r["time_ms"] for r in dijkstra_res]),
        ("Bellman-Ford", bf_res,       [f"BF\n{'s/ciclo' if 'sem' in r['case'] else 'c/ciclo'}"  for r in bf_res],       [r["time_ms"] for r in bf_res]),
    ]

    labels: list[str] = []
    times:  list[float] = []
    colors: list[str] = []
    group_spans: list[tuple[int, int, str]] = []
    GAP = 0.8
    pos = 0.0
    bar_positions: list[float] = []

    for algo_name, _, grp_labels, grp_times in groups:
        start = pos
        for lbl, t in zip(grp_labels, grp_times):
            bar_positions.append(pos)
            labels.append(lbl)
            times.append(t)
            colors.append(ALGO_COLORS[algo_name])
            pos += 1.0
        group_spans.append((start, pos - 1.0, algo_name))
        pos += GAP

    fig, ax = plt.subplots(figsize=(14, 5), facecolor=DARK_BG)
    _style_ax(ax)

    for x_start, x_end, algo_name in group_spans:
        ax.axvspan(x_start - 0.45, x_end + 0.45,
                   facecolor=ALGO_COLORS[algo_name], alpha=0.06, zorder=0)

    ax.bar(bar_positions, times, width=0.7, color=colors, alpha=0.88, zorder=2)
    ax.set_yscale("log")
    ax.set_xticks(bar_positions)
    ax.set_xticklabels(labels, fontsize=7.5, color=TEXT_COLOR)
    ax.set_ylabel("Tempo (ms) — escala log")
    ax.set_title("Comparação de Desempenho dos Algoritmos", color=TEXT_COLOR)
    ax.set_xlim(-0.6, pos - GAP + 0.6)

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
    ax.hist(weights, bins=80, color=COLOR_WEIGHT, alpha=0.55,
            edgecolor=DARK_BG, linewidth=0.2)
    ax.set_yscale("log")
    ax.set_xscale("log")
    ax.set_xlabel("Weight (pontos gerados via assistência)")
    ax.set_ylabel("Frequência (log)")
    ax.set_title("Distribuição de Weights — Rede NBA", color=TEXT_COLOR)

    for pct, val, col, ls in [
        (50, p50, COLOR_P50, "-"),
        (90, p90, COLOR_P90, "--"),
        (99, p99, COLOR_P99, ":"),
    ]:
        ax.axvline(val, color=col, linestyle=ls, linewidth=1.5,
                   label=f"P{pct} = {int(val)}")

    ax.legend(facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")

_CATEGORICAL_15 = [
    "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
    "#fb923c", "#e879f9", "#4ade80", "#facc15", "#60a5fa",
    "#f472b6", "#2dd4bf", "#c084fc", "#86efac", "#fca5a1",
]

def _viz_top_recebedores(g, out_path: Path, top_n: int = 15) -> None:
    in_deg = sorted(
        [(n, g.in_degree(n)) for n in g.nodes],
        key=lambda x: -x[1],
    )[:top_n]

    labels = [x[0] for x in reversed(in_deg)]
    values = [x[1] for x in reversed(in_deg)]
    n = len(values)
    max_v = values[-1]

    bar_colors = _CATEGORICAL_15[:n]

    fig, ax = plt.subplots(figsize=(10, 6), facecolor=DARK_BG)
    _style_ax(ax)
    bars = ax.barh(labels, values, color=bar_colors, height=0.65, alpha=0.88)

    bars[-1].set_edgecolor("#ffffff")
    bars[-1].set_linewidth(1.2)

    ax.set_xlabel("Grau de Entrada (nº de parceiros que assistiram)")
    ax.set_title(f"Top {top_n} Recebedores — Rede NBA", color=TEXT_COLOR)

    for i, (bar, v) in enumerate(zip(bars, values)):
        txt_color = "#ffffff" if i == n - 1 else TEXT_COLOR
        ax.text(v + max_v * 0.01, bar.get_y() + bar.get_height() / 2,
                str(v), va="center", color=txt_color,
                fontsize=9 if i == n - 1 else 8,
                fontweight="bold" if i == n - 1 else "normal")

    ax.set_xlim(0, max_v * 1.12)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")

def _viz_bfs_layers(bfs_res, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 5), facecolor=DARK_BG)
    _style_ax(ax)

    max_layers = max(len(r["layer_sizes"]) for r in bfs_res)
    palette = plt.cm.YlGnBu(np.linspace(0.18, 0.92, max_layers))
    x = np.arange(len(bfs_res))
    bar_width = 0.55
    bottom = np.zeros(len(bfs_res))

    for layer_idx in range(max_layers):
        vals = [
            r["layer_sizes"][layer_idx] if layer_idx < len(r["layer_sizes"]) else 0
            for r in bfs_res
        ]
        ax.bar(x, vals, bar_width, bottom=bottom,
               color=palette[layer_idx], label=f"Camada {layer_idx}", zorder=2)
        bottom += np.array(vals)

    ax.set_xticks(x)
    ax.set_xticklabels([r["source"] for r in bfs_res], color=TEXT_COLOR, fontsize=9)
    ax.set_ylabel("Nós por camada")
    ax.set_title("Camadas BFS por Fonte", color=TEXT_COLOR)
    ax.legend(facecolor=PANEL_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR,
              fontsize=8, loc="upper right", ncol=2)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"  Salvo: {out_path}")

                                                                         
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
TIER_SIZES = {
    "S": 40,
    "A": 30,
    "B": 22,
    "C": 15,
    "D": 10,
}

                                                              
NBA_SAMPLE_STARS = ["G. Antetokounmpo", "T. Young", "G. Hill"]

def _tier_for(total: int) -> str:
    if total >= 200: return "S"
    if total >= 100: return "A"
    if total >= 50:  return "B"
    if total >= 20:  return "C"
    return "D"

def build_nba_sample(g) -> dict:
    from src.graphs.digraph_algorithms import bfs_directed

                                                                   
    nodes_set: set[str] = set()
    for s in NBA_SAMPLE_STARS:
        _, layers, _ = bfs_directed(g, s)
        for layer in layers[:2]:
            nodes_set.update(layer)

                                       
    sample_edges = [
        e for e in g.edges()
        if e.source in nodes_set and e.target in nodes_set
    ]

                               
    out_deg = {n: g.out_degree(n) for n in nodes_set}
    in_deg = {n: g.in_degree(n) for n in nodes_set}

                                                                  
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

                                                  
    nodes_js = []
    for n in sorted(nodes_set):
        od = out_deg[n]
        id_ = in_deg[n]
        tier = get_tier(n)
        color = TIER_COLORS[tier]
        size = TIER_SIZES[tier]
                                                                       
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
            "playerName": n,                                                  
            "defaultLabel": default_label,
            "tooltipHtml": tooltip,
            "group": tier,
            "tier": tier,
            "tierLabel": TIER_LABELS[tier],
            "size": size,
            "value": od + id_,                                 
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
            "value": e.weight,                                 
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

                                                                             
                  
                                                                             

def solve_parte2(root: Path | None = None, verbose: bool = True) -> None:
    from src.graphs.digraph import digraph_from_csv

    root = _project_root(root)
    out = _out_dir(root)
    csv_path = root / "data" / "dataset_parte2" / "nba_graph_final.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset não encontrado: {csv_path}")

                       
    if verbose:
        print("Carregando grafo NBA...")
    t0 = time.perf_counter()
    g = digraph_from_csv(csv_path)
    load_time = (time.perf_counter() - t0) * 1000
    if verbose:
        print(f"  {g.num_nodes()} nós, {g.num_edges()} arestas em {load_time:.0f} ms")

                     
    stats = _compute_stats(g)
    if verbose:
        print(f"  Densidade: {stats['density']}")
        print(f"  Out-degree: min={stats['out_degree']['min']} max={stats['out_degree']['max']} "
              f"média={stats['out_degree']['mean']}")

                   
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

                      
    if verbose:
        print("\nGerando visualizações...")

    _viz_degree_distribution(g, out / "parte2_distribuicao_graus.png")
    _viz_top_passadores(g, out / "parte2_top_passadores.png")
    _viz_top_recebedores(g, out / "parte2_top_recebedores.png")
    _viz_comparacao_algoritmos(
        bfs_results, dfs_results, dijkstra_results, bf_results,
        out / "parte2_comparacao_algoritmos.png",
    )
    _viz_weight_distribution(g, out / "parte2_distribuicao_pesos.png")
    _viz_bfs_layers(bfs_results, out / "parte2_bfs_camadas.png")

                        
                       
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
