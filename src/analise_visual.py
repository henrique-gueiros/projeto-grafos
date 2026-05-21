"""
Implementa os requisitos 7, 8 e 9 do projeto.
Usa apenas matplotlib, numpy e pyvis — sem networkx.
"""

import json
import math
import matplotlib.lines as mlines
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from src.graphs.graph import Graph
from src.graphs.algorithms import dijkstra_caminho
from src.metricas import calc_ego, calc_global, calc_regioes


def _get_out_dir(root: Path | None = None) -> Path:
    if root:
        return root / "out"
    return Path(__file__).resolve().parent.parent / "out"


# ---------------------------------------------------------------------------
# Helpers de layout (sem networkx)
# ---------------------------------------------------------------------------

def _circular_layout(nodes: list[str], radius: float = 1.0) -> dict[str, tuple[float, float]]:
    """Posiciona nós uniformemente em um círculo."""
    n = len(nodes)
    if n == 0:
        return {}
    if n == 1:
        return {nodes[0]: (0.0, 0.0)}
    return {
        node: (
            radius * math.cos(2 * math.pi * i / n - math.pi / 2),
            radius * math.sin(2 * math.pi * i / n - math.pi / 2),
        )
        for i, node in enumerate(nodes)
    }


def _star_layout(hub: str, outer: list[str], radius: float = 1.0) -> dict[str, tuple[float, float]]:
    """Hub no centro; demais nós distribuídos em volta."""
    pos: dict[str, tuple[float, float]] = {hub: (0.0, 0.0)}
    n = len(outer)
    for i, node in enumerate(outer):
        angle = 2 * math.pi * i / max(n, 1) - math.pi / 2
        pos[node] = (radius * math.cos(angle), radius * math.sin(angle))
    return pos


def _draw_node(ax, x: float, y: float, label: str, color: str,
               border: str = "white", radius: float = 0.07, fontsize: int = 10) -> None:
    """Desenha um nó (círculo + rótulo) em um Axes."""
    circle = mpatches.Circle(
        (x, y), radius, facecolor=color, edgecolor=border, linewidth=2, zorder=3
    )
    ax.add_patch(circle)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fontsize, fontweight="bold", zorder=4, color="black")


def _draw_edge(ax, x1: float, y1: float, x2: float, y2: float,
               color: str = "#888888", linewidth: float = 1.5) -> None:
    """Desenha uma aresta entre dois pontos."""
    ax.plot([x1, x2], [y1, y2], color=color, linewidth=linewidth,
            zorder=1, solid_capstyle="round")


# ---------------------------------------------------------------------------
# Requisito 7 — Árvore de percurso
# ---------------------------------------------------------------------------

def visualizar_arvore_percurso(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    out_dir.mkdir(parents=True, exist_ok=True)

    _, caminho1 = dijkstra_caminho(grafo, "REC", "POA")
    _, caminho2 = dijkstra_caminho(grafo, "MAO", "GRU")

    all_nodes: set[str] = set()
    if caminho1:
        all_nodes.update(caminho1)
    if caminho2:
        all_nodes.update(caminho2)

    if not all_nodes:
        print("Aviso: nenhum percurso encontrado para visualização.")
        return None

    # Layout: cada caminho em uma linha horizontal própria
    pos: dict[str, tuple[float, float]] = {}
    if caminho1:
        n = len(caminho1)
        xs = [i / max(n - 1, 1) for i in range(n)]
        for node, x in zip(caminho1, xs):
            pos[node] = (x, 0.6)
    if caminho2:
        n = len(caminho2)
        xs = [i / max(n - 1, 1) for i in range(n)]
        for node, x in zip(caminho2, xs):
            if node not in pos:
                pos[node] = (x, -0.3)

    fig, ax = plt.subplots(figsize=(11, 6))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(
        "Subgrafo dos Percursos Obrigatórios (Árvore de Caminho)",
        fontsize=13, fontweight="bold", pad=14,
    )

    # Arestas do caminho 1
    if caminho1:
        for i in range(len(caminho1) - 1):
            x1, y1 = pos[caminho1[i]]
            x2, y2 = pos[caminho1[i + 1]]
            _draw_edge(ax, x1, y1, x2, y2, color="#e53935", linewidth=3.5)

    # Arestas do caminho 2
    if caminho2:
        for i in range(len(caminho2) - 1):
            x1, y1 = pos[caminho2[i]]
            x2, y2 = pos[caminho2[i + 1]]
            _draw_edge(ax, x1, y1, x2, y2, color="#1e88e5", linewidth=3.5)

    # Nós
    path1_set = set(caminho1 or [])
    path2_set = set(caminho2 or [])
    for node, (x, y) in pos.items():
        in_p1, in_p2 = node in path1_set, node in path2_set
        if in_p1 and in_p2:
            color, border = "#ab47bc", "white"
        elif in_p1:
            color, border = "#ef9a9a", "white"
        else:
            color, border = "#90caf9", "white"
        _draw_node(ax, x, y, node, color, border, radius=0.06)

    ax.set_xlim(-0.15, 1.15)
    ax.set_ylim(-0.7, 1.1)

    legend_elements = [
        mlines.Line2D([0], [0], color="#e53935", linewidth=3, label="REC → POA"),
        mlines.Line2D([0], [0], color="#1e88e5", linewidth=3, label="MAO → GRU"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=10, framealpha=0.8)

    png_path = out_dir / "arvore_percurso.png"
    plt.savefig(png_path, bbox_inches="tight", dpi=150)
    plt.close()
    return png_path


# ---------------------------------------------------------------------------
# Requisito 8 — Visualizações analíticas
# ---------------------------------------------------------------------------

def visualizar_distribuicao_graus(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    graus = [d["grau"] for d in ego_data]

    plt.figure(figsize=(8, 6))
    plt.hist(graus, bins=range(min(graus), max(graus) + 2),
             color="teal", edgecolor="black", alpha=0.7)
    plt.title("Distribuição de Graus dos Aeroportos")
    plt.xlabel("Grau (Número de Conexões)")
    plt.ylabel("Frequência (Quantidade de Aeroportos)")
    plt.grid(axis="y", linestyle="--", alpha=0.6)

    save_path = out_dir / "distribuicao_graus.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    return save_path


def visualizar_ranking_conectividade(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    sorted_data = sorted(ego_data, key=lambda x: x["grau"], reverse=True)[:10]

    iatas = [d["aeroporto"] for d in sorted_data]
    graus = [d["grau"] for d in sorted_data]

    plt.figure(figsize=(10, 6))
    colors = plt.get_cmap("viridis")(np.linspace(0, 0.8, len(iatas)))
    bars = plt.bar(iatas, graus, color=colors)
    plt.title("Top 10 Aeroportos Mais Conectados")
    plt.xlabel("Código IATA")
    plt.ylabel("Grau")

    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width() / 2, yval + 0.1,
                 yval, ha="center", va="bottom")

    save_path = out_dir / "ranking_conectividade.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    return save_path


def visualizar_comparacao_regioes(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    regioes_data = calc_regioes(grafo)

    regioes = [r["regiao"] for r in regioes_data]
    num_aeroportos = [r["ordem"] for r in regioes_data]

    plt.figure(figsize=(10, 6))
    plt.bar(regioes, num_aeroportos, color="coral")
    plt.title("Quantidade de Aeroportos por Região")
    plt.xlabel("Região")
    plt.ylabel("Número de Aeroportos")

    save_path = out_dir / "comparacao_regioes.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    return save_path


def visualizar_subgrafo_maior_grau(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    if not ego_data:
        return None

    hub = max(ego_data, key=lambda x: x["grau"])["aeroporto"]
    vizinhos = [v for v, _ in grafo.neighbors(hub)]
    node_set = {hub} | set(vizinhos)

    # Arestas dentro do subgrafo
    subedges: list[tuple[str, str]] = []
    for u in node_set:
        for v, _ in grafo.neighbors(u):
            if v in node_set and u < v:
                subedges.append((u, v))

    pos = _star_layout(hub, sorted(vizinhos), radius=1.0)

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(f"Subgrafo da Ego-rede do Hub: {hub}",
                 fontsize=13, fontweight="bold", pad=14)

    for u, v in subedges:
        x1, y1 = pos[u]
        x2, y2 = pos[v]
        _draw_edge(ax, x1, y1, x2, y2, color="#aaaaaa", linewidth=1.2)

    for node, (x, y) in pos.items():
        if node == hub:
            _draw_node(ax, x, y, node, "gold", border="darkorange", radius=0.09, fontsize=11)
        else:
            _draw_node(ax, x, y, node, "lightblue", border="steelblue", radius=0.07, fontsize=9)

    margin = 1.25
    ax.set_xlim(-margin, margin)
    ax.set_ylim(-margin, margin)

    legend_elements = [
        mpatches.Patch(color="gold", label=f"Hub: {hub}"),
        mpatches.Patch(color="lightblue", label="Vizinhos diretos"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=10, framealpha=0.8)

    save_path = out_dir / "subgrafo_hub.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    return save_path




# ---------------------------------------------------------------------------
# Requisito 9 — Grafo interativo (pyvis)
# ---------------------------------------------------------------------------

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def _ler_template(nome: str) -> str:
    return (_TEMPLATES_DIR / nome).read_text(encoding="utf-8")


def _injetar_legenda(
    html_path: Path,
    caminho1: list[str] | None,
    caminho2: list[str] | None,
    path1_edges: set[tuple[str, str]],
    path2_edges: set[tuple[str, str]],
    region_colors: dict[str, str],
    path1_color: str,
    path2_color: str,
    default_edge: str = "#4a4a5a",
    highlight_width: int = 4,
) -> None:
    """Injeta legenda e estilos customizados no HTML gerado pelo pyvis."""
    c1_str = " → ".join(caminho1) if caminho1 else "N/D"
    c2_str = " → ".join(caminho2) if caminho2 else "N/D"

    region_rows = "".join(
        f'<div class="leg-row">'
        f'<div class="dot" style="background:{c}"></div>'
        f'<span>{r}</span></div>'
        for r, c in region_colors.items()
    )

    css = _ler_template("grafo.css")
    js_filtro = _ler_template("filtro_sidebar.js")
    js_caminhos = _ler_template("caminhos_legenda.js")
    legenda = _ler_template("legenda.html").format(
        region_rows=region_rows,
        path1_color=path1_color,
        path2_color=path2_color,
        c1_str=c1_str,
        c2_str=c2_str,
    )

    caminhos_config = json.dumps({
        "path1": {
            "color": path1_color,
            "edges": [list(pair) for pair in sorted(path1_edges)],
        },
        "path2": {
            "color": path2_color,
            "edges": [list(pair) for pair in sorted(path2_edges)],
        },
        "defaultEdge": {"color": default_edge, "width": 1},
        "highlightWidth": highlight_width,
    })

    legend_html = (
        f"<style>\n{css}\n</style>\n"
        f"{legenda}\n"
        f"<script>window.CAMINHOS_OBRIGATORIOS = {caminhos_config};</script>\n"
        f"<script>\n{js_filtro}\n</script>\n"
        f"<script>\n{js_caminhos}\n</script>"
    )

    html = html_path.read_text(encoding="utf-8")
    html = html.replace("</body>", legend_html + "\n</body>")
    html_path.write_text(html, encoding="utf-8")


def gerar_grafo_interativo(grafo: Graph, root: Path | None = None) -> Path:
    """
    Req 9 — HTML interativo com pyvis (sem networkx).

    Recursos:
    - Tooltip por nó: grau, região, densidade_ego.
    - Caixa de busca/filtro (filter_menu do pyvis).
    - Legenda com caminhos obrigatórios REC→POA e MAO→GRU clicáveis
      (destaque nas arestas só ao clicar na legenda).
    """
    try:
        from pyvis.network import Network
    except ImportError:
        raise ImportError("pyvis não instalado. Execute: pip install pyvis")

    out_dir = _get_out_dir(root)
    out_dir.mkdir(parents=True, exist_ok=True)

    ego_data = calc_ego(grafo)
    ego_map = {d["aeroporto"]: d for d in ego_data}

    _, caminho_rec_poa = dijkstra_caminho(grafo, "REC", "POA")
    _, caminho_mao_gru = dijkstra_caminho(grafo, "MAO", "GRU")

    path1_edges: set[tuple[str, str]] = set()
    path2_edges: set[tuple[str, str]] = set()

    if caminho_rec_poa:
        for i in range(len(caminho_rec_poa) - 1):
            path1_edges.add(tuple(sorted((caminho_rec_poa[i], caminho_rec_poa[i + 1]))))  # type: ignore[arg-type]

    if caminho_mao_gru:
        for i in range(len(caminho_mao_gru) - 1):
            path2_edges.add(tuple(sorted((caminho_mao_gru[i], caminho_mao_gru[i + 1]))))  # type: ignore[arg-type]

    path1_nodes = set(caminho_rec_poa or [])
    path2_nodes = set(caminho_mao_gru or [])

    REGION_COLORS: dict[str, str] = {
        "Norte":        "#4fc3f7",
        "Nordeste":     "#81c784",
        "Centro-Oeste": "#ffb74d",
        "Sudeste":      "#f48fb1",
        "Sul":          "#ce93d8",
    }
    PATH1_COLOR = "#ff4d4d"
    PATH2_COLOR = "#00e5ff"
    DEFAULT_EDGE = "#4a4a5a"

    net = Network(
        height="820px",
        width="100%",
        bgcolor="#0f0f1a",
        font_color="#e0e0e0",
        filter_menu=True,
        select_menu=False,
        notebook=False,
        cdn_resources="in_line",
    )

    for iata in sorted(grafo.nodes):
        node = grafo.nodes[iata]
        ego = ego_map.get(iata, {})
        grau = ego.get("grau", 0)
        densidade = ego.get("densidade_ego", 0.0)
        regiao = node.regiao
        base_color = REGION_COLORS.get(regiao, "#90a4ae")

        tooltip = (
            f"<b style='font-size:14px'>{iata}</b><br>"
            f"<b>Cidade:</b> {node.cidade}<br>"
            f"<b>Região:</b> {regiao}<br>"
            f"<b>Grau:</b> {grau}<br>"
            f"<b>Densidade ego:</b> {densidade:.4f}"
        )

        in_p1 = iata in path1_nodes
        in_p2 = iata in path2_nodes
        is_endpoint = iata in {"REC", "POA", "MAO", "GRU"}

        border_color, border_width = base_color, 1
        node_size = 32 if is_endpoint else (22 if (in_p1 or in_p2) else 16)

        net.add_node(
            iata,
            label=iata,
            title=tooltip,
            color={
                "background": base_color,
                "border": border_color,
                "highlight": {"background": base_color, "border": "#ffffff"},
            },
            size=node_size,
            borderWidth=border_width,
            font={"size": 13, "color": "#111111", "bold": True},
            group=regiao,
        )

    for edge in grafo.edges():
        edge_tooltip = (
            f"{edge.origem} ↔ {edge.destino}"
            f" | Tipo: {edge.tipo_conexao}"
            f" | Peso: {edge.peso}"
            f" | {edge.justificativa}"
        )

        net.add_edge(
            edge.origem,
            edge.destino,
            color={"color": DEFAULT_EDGE, "highlight": "#ffffff"},
            width=1,
            title=edge_tooltip,
        )

    net.set_options(json.dumps({
        "physics": {
            "solver": "forceAtlas2Based",
            "forceAtlas2Based": {
                "gravitationalConstant": -80,
                "centralGravity": 0.01,
                "springLength": 130,
                "springConstant": 0.07,
                "damping": 0.4,
            },
            "stabilization": {"iterations": 250, "fit": True},
        },
        "interaction": {
            "hover": True,
            "tooltipDelay": 80,
            "navigationButtons": False,
            "keyboard": True,
        },
    }))

    html_path = out_dir / "grafo_interativo.html"
    html_path.write_text(net.generate_html(), encoding="utf-8")

    _injetar_legenda(
        html_path, caminho_rec_poa, caminho_mao_gru,
        path1_edges, path2_edges,
        REGION_COLORS, PATH1_COLOR, PATH2_COLOR, DEFAULT_EDGE,
    )

    return html_path


# ---------------------------------------------------------------------------
# Requisito 10 — Análise exploratória e explanatória (AVD)
# ---------------------------------------------------------------------------

_REGION_COLORS = {
    "Norte":        "#4fc3f7",
    "Nordeste":     "#81c784",
    "Centro-Oeste": "#ffb74d",
    "Sudeste":      "#f48fb1",
    "Sul":          "#ce93d8",
}
_HUBS = {"BSB", "GRU", "GIG"}


def _explr_dispersao_grau_densidade(grafo: Graph, out_dir: Path) -> Path:
    """
    Exploratória 1 — Scatter grau × densidade-ego.
    Revela a estrutura bimodal da rede: hubs isolados vs. aeroportos regionais.
    """
    ego_data = calc_ego(grafo)
    reg_lookup = {iata: node.regiao for iata, node in grafo.nodes.items()}

    fig, ax = plt.subplots(figsize=(10, 7))

    region_groups: dict[str, list] = {}
    for d in ego_data:
        r = reg_lookup[d["aeroporto"]]
        region_groups.setdefault(r, []).append(d)

    for regiao, items in sorted(region_groups.items()):
        xs = [d["grau"] for d in items]
        ys = [d["densidade_ego"] for d in items]
        color = _REGION_COLORS.get(regiao, "#aaaaaa")
        ax.scatter(xs, ys, c=color, s=130, label=regiao, zorder=3,
                   edgecolors="white", linewidths=0.8)
        for d in items:
            ax.annotate(
                d["aeroporto"], (d["grau"], d["densidade_ego"]),
                textcoords="offset points", xytext=(6, 3),
                fontsize=8, color="#333333",
            )

    ax.set_xlabel("Grau (número de conexões)", fontsize=11)
    ax.set_ylabel("Densidade da ego-rede", fontsize=11)
    ax.set_title("Dispersão: Grau vs. Densidade Ego por Aeroporto", fontsize=13,
                 fontweight="bold", pad=14)
    ax.legend(title="Região", fontsize=9, title_fontsize=9)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.set_ylim(-0.05, 1.15)

    # Anotação interpretativa
    ax.text(0.02, 0.08,
            "Aeroportos regionais: grau baixo, ego-rede totalmente densa\n"
            "Hubs nacionais: grau máximo, ego-rede com mesma densidade da rede global",
            transform=ax.transAxes, fontsize=8.5, color="#555555",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#f5f5f5", edgecolor="#cccccc"))

    save_path = out_dir / "explr_dispersao_grau_densidade.png"
    plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()
    return save_path


def _explr_matriz_regioes(grafo: Graph, out_dir: Path) -> Path:
    """
    Exploratória 2 — Heatmap de conexões entre regiões.
    Revela quais pares de regiões trocam mais conexões diretas.
    """
    regioes = sorted({node.regiao for node in grafo.nodes.values()})
    idx = {r: i for i, r in enumerate(regioes)}
    n = len(regioes)
    reg_lookup = {iata: node.regiao for iata, node in grafo.nodes.items()}

    matrix = [[0] * n for _ in range(n)]
    for edge in grafo.edges():
        i = idx[reg_lookup[edge.origem]]
        j = idx[reg_lookup[edge.destino]]
        matrix[i][j] += 1
        if i != j:
            matrix[j][i] += 1

    data = np.array(matrix, dtype=float)

    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(data, cmap="Blues", aspect="auto")

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(regioes, rotation=28, ha="right", fontsize=10)
    ax.set_yticklabels(regioes, fontsize=10)

    vmax = data.max()
    for i in range(n):
        for j in range(n):
            val = int(matrix[i][j])
            text_color = "white" if val > vmax * 0.55 else "black"
            ax.text(j, i, str(val), ha="center", va="center",
                    fontsize=11, fontweight="bold", color=text_color)

    plt.colorbar(im, ax=ax, label="Número de conexões")
    ax.set_title("Matriz de Conexões entre Regiões", fontsize=13,
                 fontweight="bold", pad=14)
    ax.set_xlabel("Região de destino", fontsize=11)
    ax.set_ylabel("Região de origem", fontsize=11)

    save_path = out_dir / "explr_matriz_regioes.png"
    plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()
    return save_path


def _expl_dominancia_hubs(grafo: Graph, out_dir: Path) -> Path:
    """
    Explanatória 1 — Dominância dos hubs nacionais.
    Mensagem principal: BSB, GRU e GIG concentram a maior fatia do grau total.
    Interpretável por quem não conhece o projeto.
    """
    ego_data = sorted(calc_ego(grafo), key=lambda x: x["grau"])

    iatas = [d["aeroporto"] for d in ego_data]
    graus = [d["grau"] for d in ego_data]
    colors = ["#e53935" if iata in _HUBS else "#90caf9" for iata in iatas]

    hub_degree_sum = sum(d["grau"] for d in ego_data if d["aeroporto"] in _HUBS)
    total_degree_sum = sum(graus)
    hub_pct = hub_degree_sum / total_degree_sum * 100

    fig, ax = plt.subplots(figsize=(10, 7))
    bars = ax.barh(iatas, graus, color=colors, edgecolor="white", linewidth=0.5)

    for bar, val in zip(bars, graus):
        ax.text(val + 0.15, bar.get_y() + bar.get_height() / 2,
                str(val), va="center", fontsize=9, color="#333333")

    ax.set_xlabel("Grau — número de conexões diretas", fontsize=11)
    ax.set_title(
        "Os 3 hubs nacionais (BSB, GRU, GIG) concentram\na maioria das conexões da rede aérea",
        fontsize=12, fontweight="bold", pad=14,
    )
    ax.grid(axis="x", linestyle="--", alpha=0.35)

    legend_elements = [
        mpatches.Patch(color="#e53935", label="Hub nacional (BSB, GRU, GIG)"),
        mpatches.Patch(color="#90caf9", label="Aeroporto regional"),
    ]
    ax.legend(handles=legend_elements, fontsize=10, loc="lower right")

    ax.text(0.98, 0.02,
            f"BSB + GRU + GIG = {hub_pct:.0f}%\ndo grau total da rede",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=10, color="#b71c1c",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#ffebee",
                      edgecolor="#e53935", alpha=0.92))

    save_path = out_dir / "expl_dominancia_hubs.png"
    plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()
    return save_path


def _expl_densidade_regioes(grafo: Graph, out_dir: Path) -> Path:
    """
    Explanatória 2 — Densidade intra-regional vs. densidade global.
    Mensagem principal: cada região é um grupo totalmente conectado (clique),
    mas a rede nacional como um todo é esparsa.
    Interpretável por quem não conhece o projeto.
    """
    regioes_data = calc_regioes(grafo)
    global_data = calc_global(grafo)

    regioes = [r["regiao"] for r in regioes_data]
    densidades = [r["densidade"] for r in regioes_data]
    global_dens = global_data["densidade"]
    colors = [_REGION_COLORS.get(r, "#aaaaaa") for r in regioes]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(regioes, densidades, color=colors, edgecolor="white", linewidth=0.8)

    for bar, val in zip(bars, densidades):
        ax.text(bar.get_x() + bar.get_width() / 2, val + 0.015,
                f"{val:.2f}", ha="center", va="bottom",
                fontsize=12, fontweight="bold", color="#222222")

    ax.axhline(y=global_dens, color="#e53935", linewidth=2.2,
               linestyle="--", zorder=5,
               label=f"Densidade global da rede: {global_dens:.3f}")

    ax.set_ylim(0, 1.22)
    ax.set_ylabel("Densidade do subgrafo (0 = sem conexões, 1 = todos conectados)", fontsize=10)
    ax.set_title(
        "Dentro de cada região, todos os aeroportos se conectam diretamente\n"
        "(densidade = 1,0), mas a rede nacional é bem menos densa",
        fontsize=12, fontweight="bold", pad=14,
    )
    ax.legend(fontsize=10)
    ax.grid(axis="y", linestyle="--", alpha=0.35)

    ax.text(0.98, global_dens / 1.22 + 0.04,
            "← rede nacional\n    (esparsa)",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=9, color="#b71c1c",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#ffebee",
                      edgecolor="#e53935", alpha=0.88))

    save_path = out_dir / "expl_densidade_regioes.png"
    plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()
    return save_path



def gerar_analise_avd(grafo: Graph, root: Path | None = None) -> list[Path]:
    """
    Req 10 — 2 visualizações exploratórias + 2 explanatórias + análise textual.
    Retorna lista com os caminhos dos arquivos gerados.
    """
    out_dir = _get_out_dir(root)
    out_dir.mkdir(parents=True, exist_ok=True)

    paths: list[Path] = []
    paths.append(_explr_dispersao_grau_densidade(grafo, out_dir))
    paths.append(_explr_matriz_regioes(grafo, out_dir))
    paths.append(_expl_dominancia_hubs(grafo, out_dir))
    paths.append(_expl_densidade_regioes(grafo, out_dir))
    return paths


# ---------------------------------------------------------------------------
# Ponto de entrada único
# ---------------------------------------------------------------------------

def run_all_visualizations(grafo: Graph, root: Path | None = None):
    print("Gerando visualizações (Req 7 e 8)...")
    visualizar_arvore_percurso(grafo, root)
    visualizar_distribuicao_graus(grafo, root)
    visualizar_ranking_conectividade(grafo, root)
    visualizar_comparacao_regioes(grafo, root)
    visualizar_subgrafo_maior_grau(grafo, root)

    print("Gerando grafo interativo (Req 9)...")
    gerar_grafo_interativo(grafo, root)

    print("Gerando análise exploratória e explanatória (Req 10)...")
    gerar_analise_avd(grafo, root)

    print(f"Todas as visualizações foram salvas em: {_get_out_dir(root)}")
