"""Gera o PDF de análise exploratória e explanatória da Parte 2 (NBA)."""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _project_root() -> Path:
    here = Path(__file__).resolve().parent
    while here != here.parent:
        if (here / "data").is_dir():
            return here
        here = here.parent
    raise RuntimeError("Raiz do projeto não encontrada")


def _build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=13,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
            textColor=colors.grey,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
        ),
        "table_cell_path": ParagraphStyle(
            "TableCellPath",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
        ),
    }


def _table(data, col_widths=None):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8E8E8")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def _format_dijkstra_path(path: list[str] | None) -> str:
    if not path:
        return "sem caminho"
    lines: list[str] = []
    for i in range(0, len(path), 2):
        lines.append(" → ".join(path[i : i + 2]))
    return "<br/>".join(lines)


def _dijkstra_table(dijkstra_results: list[dict], styles: dict) -> Table:
    header = styles["table_header"]
    cell = styles["table_cell"]
    path_style = styles["table_cell_path"]
    col_widths = [2.3 * cm, 2.3 * cm, 1.4 * cm, 1.1 * cm, 9.9 * cm]

    rows = [
        [
            Paragraph("Origem", header),
            Paragraph("Destino", header),
            Paragraph("Custo", header),
            Paragraph("Saltos", header),
            Paragraph("Caminho", header),
        ]
    ]
    for r in dijkstra_results:
        rows.append([
            Paragraph(r["source"], cell),
            Paragraph(r["target"], cell),
            Paragraph(str(r["cost"]), cell),
            Paragraph(str(r["path_len"] or ""), cell),
            Paragraph(_format_dijkstra_path(r.get("path")), path_style),
        ])

    t = Table(rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8E8E8")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def _figure(path: Path, caption: str, styles, max_width=16 * cm):
    img = Image(str(path))
    ratio = max_width / img.drawWidth
    img.drawWidth = max_width
    img.drawHeight = img.drawHeight * ratio
    return [img, Paragraph(caption, styles["caption"])]


def _load_report(out_dir: Path) -> dict:
    report_path = out_dir / "parte2_report.json"
    if not report_path.exists():
        raise FileNotFoundError(
            f"Relatório não encontrado: {report_path}. "
            "Execute python -m src.cli parte2 antes de gerar o PDF."
        )
    report = json.loads(report_path.read_text(encoding="utf-8"))
    return _ensure_report_fields(report, out_dir)


def _ensure_report_fields(report: dict, out_dir: Path) -> dict:
    """Preenche campos ausentes em relatórios gerados por versões antigas."""
    if all(k in report for k in ("weight_percentiles", "rankings", "sample_subgraph")):
        return report

    from src.graphs.digraph import digraph_from_csv
    from src.parte2 import _top_by_degree, _weight_percentiles, build_nba_sample

    root = out_dir.parent
    csv_path = root / "data" / "dataset_parte2" / "nba_graph_final.csv"
    g = digraph_from_csv(csv_path)
    sample = build_nba_sample(g)
    report.setdefault("weight_percentiles", _weight_percentiles(g))
    report.setdefault("rankings", _top_by_degree(g))
    report.setdefault(
        "sample_subgraph",
        {
            "stars": sample["stars"],
            "num_nodes": sample["num_nodes"],
            "num_edges": sample["num_edges"],
        },
    )
    return report


def build_story(styles, report: dict, out_dir: Path) -> list:
    s = styles
    gs = report["graph_stats"]
    wpct = report["weight_percentiles"]
    top_out = report["rankings"]["top_passadores"][:3]
    top_in = report["rankings"]["top_recebedores"][:3]
    sample = report["sample_subgraph"]
    story = []

    story.append(Paragraph("ANÁLISE EXPLORATÓRIA E EXPLANATÓRIA", s["title"]))
    story.append(Paragraph("Parte 2: Rede de Assistências NBA", s["subtitle"]))
    story.append(Paragraph("Projeto Grafos", s["subtitle"]))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("1. Contexto e modelagem do grafo", s["h1"]))
    story.append(
        Paragraph(
            "Este relatório descreve a análise visual de dados (AVD) sobre a rede de "
            "assistências da NBA modelada como grafo dirigido e ponderado. Cada nó "
            "representa um jogador; cada aresta direcionada indica que o jogador de "
            "origem assistiu o de destino. O peso da aresta corresponde aos pontos "
            "gerados por aquela parceria ao longo da carreira; o custo usado nos "
            "algoritmos de caminho mínimo é o inverso do peso (1/peso), de modo que "
            "parcerias mais produtivas têm menor custo.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "O dataset está em nba_graph_final.csv, com cerca de "
            f"{gs['num_nodes']} jogadores e {gs['num_edges']} arestas. "
            "Os nomes dos jogadores nem sempre seguem o mesmo padrão (por exemplo, "
            "sobrenome isolado ou abreviatura com inicial), o que pode fragmentar "
            "um mesmo atleta em mais de um nó.",
            s["body"],
        )
    )

    story.append(Paragraph("1.1 Classificação por tier (visualização)", s["h2"]))
    story.append(
        Paragraph(
            "No grafo interativo, os jogadores são agrupados por grau total "
            "(saída + entrada): Tier S (≥ 200, Lenda), A (100 a 199, Elite), "
            "B (50 a 99, Alto), C (20 a 49, Médio) e D (&lt; 20, Base). "
            "Essa classificação serve apenas para filtros e legenda visual.",
            s["body"],
        )
    )

    story.append(Paragraph("1.2 Métricas globais", s["h2"]))
    story.append(
        Paragraph(
            f"A densidade global é {gs['density']}, bem abaixo de 1,0, o que reflete "
            "a esparsidade natural de uma rede com milhares de nós. O grau médio de "
            f"saída e de entrada fica em {gs['out_degree']['mean']}, mas a distribuição "
            "é assimétrica: o maior grau de saída alcança "
            f"{gs['out_degree']['max']} parceiros distintos, enquanto o maior grau "
            f"de entrada chega a {gs['in_degree']['max']}.",
            s["body"],
        )
    )
    story.append(
        _table(
            [
                ["Métrica", "Valor"],
                ["Ordem |V|", str(gs["num_nodes"])],
                ["Tamanho |E|", str(gs["num_edges"])],
                ["Densidade", str(gs["density"])],
                ["Grau saída (mín / máx / média)", f"{gs['out_degree']['min']} / {gs['out_degree']['max']} / {gs['out_degree']['mean']}"],
                ["Grau entrada (mín / máx / média)", f"{gs['in_degree']['min']} / {gs['in_degree']['max']} / {gs['in_degree']['mean']}"],
                ["Peso (mín / máx / média)", f"{gs['weight']['min']} / {gs['weight']['max']} / {gs['weight']['mean']}"],
                ["Percentis de peso P50 / P90 / P99", f"{wpct['p50']} / {wpct['p90']} / {wpct['p99']}"],
            ],
            col_widths=[7.5 * cm, 7 * cm],
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("2. Visualizações exploratórias", s["h1"]))
    story.append(
        Paragraph(
            "Estas visualizações buscam compreender a forma geral da rede antes de "
            "comunicar rankings e resultados de algoritmos.",
            s["body"],
        )
    )

    story.append(Paragraph("2.1 Distribuição de graus (escala log log)", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_distribuicao_graus.png<br/>"
            "<b>Tipo:</b> scatter plot em escala logarítmica<br/>"
            "Dois painéis mostram a frequência de cada valor de grau de saída e de "
            "entrada, excluindo jogadores com grau zero.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A curva decrescente em escala log log indica comportamento próximo de "
            "rede livre de escala: poucos jogadores concentram centenas de conexões, "
            "enquanto a maioria tem grau baixo. Não há um pico central típico de "
            "distribuição normal. No ranking bruto de saída aparecem sobrenomes "
            f"soltos como {top_out[0]['nome']} ({top_out[0]['grau']} parceiros), "
            f"{top_out[1]['nome']} ({top_out[1]['grau']}) e "
            f"{top_out[2]['nome']} ({top_out[2]['grau']}). Esses nós não representam "
            "um único atleta, e sim registros agregados por falta de padronização "
            "no dataset.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "O scatter em escala log log é adequado para expor caudas longas sem "
            "comprimir visualmente os valores extremos.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_distribuicao_graus.png",
            "Figura 1. Distribuição de graus de saída e entrada",
            s,
        )
    )

    story.append(Paragraph("2.2 Distribuição de pesos das assistências", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_distribuicao_pesos.png<br/>"
            "<b>Tipo:</b> histograma com linhas de percentil<br/>"
            "Cada barra agrupa parcerias por pontos gerados; linhas verticais marcam "
            f"P50 = {wpct['p50']}, P90 = {wpct['p90']} e P99 = {wpct['p99']}.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A maior parte das duplas acumula poucos pontos combinados. Apenas cerca "
            "de 10% das parcerias supera P90, e menos de 1% ultrapassa P99. "
            "Essas parcerias de elite correspondem a combinações táticas muito "
            "produtivas entre passador e finalizador.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_distribuicao_pesos.png",
            "Figura 2. Distribuição de pesos com percentis P50, P90 e P99",
            s,
        )
    )

    story.append(Paragraph("2.3 Camadas BFS por fonte", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_bfs_camadas.png<br/>"
            "<b>Tipo:</b> barras empilhadas<br/>"
            "Para cada jogador fonte, o gráfico mostra quantos nós são alcançados "
            "em cada camada da busca em largura.",
            s["body"],
        )
    )
    bfs_giannis = next(r for r in report["bfs"] if r["source"] == "G. Antetokounmpo")
    bfs_young = next(r for r in report["bfs"] if r["source"] == "T. Young")
    bfs_lebron = next(r for r in report["bfs"] if r["source"] == "L. James")
    story.append(
        Paragraph(
            f"A partir de G. Antetokounmpo e T. Young a BFS alcança "
            f"{bfs_giannis['nodes_visited']} jogadores em "
            f"{bfs_giannis['num_layers']} e {bfs_young['num_layers']} camadas, "
            "respectivamente. Já L. James, neste dataset, fica restrito a "
            f"{bfs_lebron['nodes_visited']} nós em {bfs_lebron['num_layers']} "
            "camadas, enquanto o nó genérico James alcança mais de mil jogadores "
            "se usado como fonte. A diferença confirma a fragmentação de nomes. "
            "O crescimento rápido das camadas intermediárias é típico de rede "
            "esparsa com efeito de mundo pequeno.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_bfs_camadas.png",
            "Figura 3. Camadas BFS a partir de três fontes",
            s,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("3. Visualizações explanatórias", s["h1"]))
    story.append(
        Paragraph(
            "Os gráficos abaixo destacam rankings e comparações pensadas para "
            "leitura direta, mesmo sem familiaridade com teoria de grafos.",
            s["body"],
        )
    )

    story.append(Paragraph("3.1 Top passadores da rede", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_top_passadores.png<br/>"
            "<b>Tipo:</b> barras horizontais ordenadas<br/>"
            "Lista os 15 jogadores com maior grau de saída, ou seja, que assistiram "
            "o maior número de parceiros distintos.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"O primeiro colocado do gráfico alcança {gs['out_degree']['max']} destinos "
            "diferentes, muito acima da média de "
            f"{gs['out_degree']['mean']}. Como o topo inclui sobrenomes agregados, "
            "a leitura deve considerar o gráfico junto com a tabela de métricas e "
            "não como ranking literal de passadores individuais.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_top_passadores.png",
            "Figura 4. Top 15 passadores por grau de saída",
            s,
        )
    )

    story.append(Paragraph("3.2 Top recebedores da rede", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_top_recebedores.png<br/>"
            "<b>Tipo:</b> barras horizontais ordenadas<br/>"
            "Mostra os 15 jogadores com maior grau de entrada (mais passadores "
            "distintos que lhes deram assistência).",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"Entre os primeiros colocados estão {top_in[0]['nome']} ({top_in[0]['grau']}), "
            f"{top_in[1]['nome']} ({top_in[1]['grau']}) e {top_in[2]['nome']} ({top_in[2]['grau']}). "
            "Alto grau de entrada indica finalizadores ou jogadores de movimentação "
            "constante que se tornam destinos preferenciais da bola. Neste ranking "
            "os nomes trazem inicial, o que reduz ambiguidade em relação ao gráfico "
            "de passadores.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_top_recebedores.png",
            "Figura 5. Top 15 recebedores por grau de entrada",
            s,
        )
    )

    story.append(Paragraph("3.3 Desempenho dos algoritmos", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> parte2_comparacao_algoritmos.png<br/>"
            "<b>Tipo:</b> barras agrupadas com escala log<br/>"
            "Compara o tempo de execução (ms) de BFS, DFS, Dijkstra e Bellman-Ford "
            "nas instâncias registradas no relatório.",
            s["body"],
        )
    )
    bf_slow = next(r for r in report["bellman_ford"] if r["case"] == "com_ciclo_negativo")
    story.append(
        Paragraph(
            "BFS e DFS terminam em frações de milissegundo. Dijkstra fica na casa de "
            "1 a 2 ms por par consultado. Bellman-Ford no subgrafo com ciclo negativo "
            f"({bf_slow['subgraph_nodes']} nós, {bf_slow['subgraph_edges']} arestas) "
            f"demora cerca de {bf_slow['time_ms']:.1f} ms, pois relaxa todas as "
            "arestas repetidamente. A diferença de escala justifica a escolha do "
            "algoritmo conforme a necessidade de detectar ciclos negativos.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "parte2_comparacao_algoritmos.png",
            "Figura 6. Tempo de execução por algoritmo (escala log)",
            s,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("4. Resultados algorítmicos", s["h1"]))

    story.append(Paragraph("4.1 Caminhos mínimos (Dijkstra)", s["h2"]))
    story.append(
        Paragraph(
            "O custo de um caminho é a soma dos inversos dos pesos das arestas. "
            "Valores menores indicam cadeias de parcerias mais fortes. "
            "Exemplos obtidos sobre o grafo completo:",
            s["body"],
        )
    )
    story.append(_dijkstra_table(report["dijkstra"], s))

    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("4.2 Busca em profundidade (DFS)", s["h2"]))
    story.append(
        Paragraph(
            "A DFS confirma ciclos em todas as fontes testadas, como esperado em "
            "grafo dirigido de assistências mútuas. Em G. Antetokounmpo e T. Young "
            "são visitados 873 nós, com centenas de arestas forward e cross além "
            "das back edges que indicam ciclo.",
            s["body"],
        )
    )
    dfs_lebron = next(r for r in report["dfs"] if r["source"] == "L. James")
    story.append(
        Paragraph(
            f"Para L. James a DFS alcança {dfs_lebron['nodes_visited']} nós, "
            f"coerente com a BFS, e registra {dfs_lebron['edge_types']['back']} "
            "back edge.",
            s["body"],
        )
    )

    story.append(Paragraph("4.3 Bellman-Ford", s["h2"]))
    for bf in report["bellman_ford"]:
        ciclo = "sim" if bf["has_negative_cycle"] else "não"
        story.append(
            Paragraph(
                f"<b>{bf['description']}</b><br/>"
                f"Fonte: {bf['source']}; subgrafo com {bf['subgraph_nodes']} nós e "
                f"{bf['subgraph_edges']} arestas; fórmula de peso {bf['bf_weight_formula']}; "
                f"ciclo negativo: {ciclo}; tempo {bf['time_ms']} ms.",
                s["body"],
            )
        )

    story.append(Paragraph("4.4 Padrões identificados", s["h2"]))
    story.append(
        Paragraph(
            "A rede segue distribuição assimétrica de graus, compatível com rede "
            "livre de escala: poucos nós concentram muitas conexões e a maioria "
            "opera com grau modesto.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A distribuição de graus e de pesos é fortemente assimétrica, compatível "
            "com rede livre de escala e com parcerias de elite muito acima da mediana.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "BFS a partir de jogadores bem conectados alcança centenas de nós em "
            "poucas camadas, mas a fragmentação de nomes limita o alcance de "
            "algumas fontes, como L. James neste dataset.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"O subgrafo interativo (união do 1 hop BFS de "
            f"{', '.join(sample['stars'][:-1])} e {sample['stars'][-1]}) "
            f"reúne {sample['num_nodes']} jogadores e {sample['num_edges']} arestas "
            "para exploração visual no HTML e na interface React.",
            s["body"],
        )
    )

    story.append(Paragraph("4.5 Síntese metodológica", s["h2"]))
    story.append(
        Paragraph(
            "Foram produzidas três visualizações exploratórias (distribuição de graus, "
            "distribuição de pesos e camadas BFS) e três explanatórias (top passadores, "
            "top recebedores e comparação de algoritmos). Os algoritmos BFS, DFS, "
            "Dijkstra e Bellman-Ford foram executados sobre o grafo completo; os "
            "resultados numéricos ficam em out/parte2_report.json.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Comando de reprodução: python -m src.cli parte2 (gera PNGs, JSON e HTML "
            "em out/) e python -m src.gerar_pdf_nba (gera este PDF).",
            s["body"],
        )
    )

    return story


def gerar_pdf_nba(root: Path | None = None) -> Path:
    root = root or _project_root()
    out_dir = root / "out"
    report = _load_report(out_dir)
    output = root / "ANÁLISE EXPLORATÓRIA E EXPLANATÓRIA NBA (completo).pdf"

    required = [
        "parte2_distribuicao_graus.png",
        "parte2_distribuicao_pesos.png",
        "parte2_bfs_camadas.png",
        "parte2_top_passadores.png",
        "parte2_top_recebedores.png",
        "parte2_comparacao_algoritmos.png",
    ]
    missing = [f for f in required if not (out_dir / f).exists()]
    if missing:
        raise FileNotFoundError(
            "PNG(s) ausente(s): " + ", ".join(missing) + ". "
            "Execute python -m src.cli parte2 primeiro."
        )

    styles = _build_styles()
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Análise Exploratória e Explanatória NBA",
        author="Projeto Grafos",
    )
    doc.build(build_story(styles, report, out_dir))
    return output


def main():
    path = gerar_pdf_nba()
    print(f"PDF gerado: {path}")


if __name__ == "__main__":
    main()
