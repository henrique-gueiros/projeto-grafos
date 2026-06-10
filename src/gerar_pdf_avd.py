"""Gera o PDF de análise exploratória e explanatória da Parte 1 (aeroportos)."""

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

_HUBS = {"BSB", "GRU", "GIG"}


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


def _figure(path: Path, caption: str, styles, max_width=16 * cm):
    img = Image(str(path))
    ratio = max_width / img.drawWidth
    img.drawWidth = max_width
    img.drawHeight = img.drawHeight * ratio
    return [img, Paragraph(caption, styles["caption"])]


def _load_metrics(out_dir: Path) -> tuple[dict, list[dict], int]:
    global_path = out_dir / "global.json"
    regioes_path = out_dir / "regioes.json"
    if not global_path.exists() or not regioes_path.exists():
        raise FileNotFoundError(
            "Métricas não encontradas em out/. Execute python -m src.cli metricas primeiro."
        )
    global_data = json.loads(global_path.read_text(encoding="utf-8"))
    regioes_data = json.loads(regioes_path.read_text(encoding="utf-8"))

    from src.graphs.graph import graph_from_csv_files
    from src.metricas import calc_ego

    ego = calc_ego(graph_from_csv_files(root=out_dir.parent))
    hub_sum = sum(d["grau"] for d in ego if d["aeroporto"] in _HUBS)
    total = sum(d["grau"] for d in ego)
    hub_pct = round(hub_sum / total * 100) if total else 0
    return global_data, regioes_data, hub_pct


def build_story(styles, out_dir: Path) -> list:
    s = styles
    global_data, regioes_data, hub_pct = _load_metrics(out_dir)
    dens_global = global_data["densidade"]
    dens_fmt = f"{dens_global:.6f}".replace(".", ",")

    story = []
    story.append(Paragraph("ANÁLISE EXPLORATÓRIA E EXPLANATÓRIA", s["title"]))
    story.append(Paragraph("Requisito 10: Rede de Aeroportos do Brasil", s["subtitle"]))
    story.append(Paragraph("Projeto Grafos", s["subtitle"]))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("1. Contexto e modelagem do grafo", s["h1"]))
    story.append(
        Paragraph(
            "Este relatório descreve a análise visual de dados (AVD) aplicada à rede de "
            "20 aeroportos brasileiros representada como grafo. Cada nó corresponde a um "
            "aeroporto (código IATA) e as arestas obedecem três regras de conexão: "
            "regional, ligando todos os aeroportos da mesma região; hub, conectando "
            "aeroportos não hub aos hubs nacionais fora da sua região; e hub hub, "
            "completando eixos entre hubs ainda não cobertos pela regra regional.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Os hubs nacionais são GRU, GIG e BSB. A distribuição regional é de 4 aeroportos "
            "no Norte, 6 no Nordeste, 2 no Centro Oeste, 5 no Sudeste e 3 no Sul.",
            s["body"],
        )
    )

    story.append(Paragraph("1.1 Pesos das arestas (modelo híbrido)", s["h2"]))
    story.append(Paragraph("peso = 1,0 + penalidade_região + penalidade_hub", s["body"]))
    story.append(
        _table(
            [
                ["Situação", "Peso", "Exemplo"],
                ["Intra regional com hub", "1,0", "BSB e GYN"],
                ["Intra regional sem hub", "1,5", "FOR e JPA"],
                ["Inter regional com hub", "2,0", "GRU e REC"],
            ],
            col_widths=[7 * cm, 2.5 * cm, 3 * cm],
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("1.2 Métricas globais e regionais", s["h2"]))
    story.append(
        Paragraph(
            f"As métricas a seguir orientam as visualizações exploratórias e explanatórias. "
            f"A densidade global, cerca de {dens_global:.2f}, contrasta com densidade 1,0 "
            "em todos os subgrafos regionais.",
            s["body"],
        )
    )
    story.append(
        _table(
            [
                ["Métrica", "Valor"],
                ["Ordem |V|", str(global_data["ordem"])],
                ["Tamanho |E|", str(global_data["tamanho"])],
                ["Densidade global", dens_fmt],
            ],
            col_widths=[6 * cm, 3 * cm],
        )
    )
    story.append(Spacer(1, 0.2 * cm))

    reg_rows = [["Região", "|V|", "|E|", "Densidade"]]
    for r in regioes_data:
        dens = f"{r['densidade']:.6f}".replace(".", ",")
        reg_rows.append([r["regiao"].replace("-", " "), str(r["ordem"]), str(r["tamanho"]), dens])
    story.append(_table(reg_rows, col_widths=[4 * cm, 1.5 * cm, 1.5 * cm, 3 * cm]))

    story.append(PageBreak())
    story.append(Paragraph("2. Visualizações exploratórias", s["h1"]))
    story.append(
        Paragraph(
            "Nesta etapa o foco foi entender o comportamento dos dados e levantar padrões "
            "iniciais antes de montar as visualizações de comunicação.",
            s["body"],
        )
    )

    story.append(Paragraph("2.1 Dispersão: grau vs. densidade da ego rede", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> out/explr_dispersao_grau_densidade.png<br/>"
            "<b>Tipo:</b> scatter plot (dispersão)<br/>"
            "Cada aeroporto aparece como um ponto. O eixo X representa o grau (conexões "
            "diretas), o eixo Y a densidade da ego rede e a cor indica a região.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A rede mostra estrutura bimodal. Os três hubs nacionais (BSB, GRU e GIG) ficam "
            f"no canto direito inferior, com grau máximo (19) e densidade ego próxima de "
            f"{dens_global:.2f}, valor equivalente à densidade global. Os demais aeroportos, "
            "em qualquer região, ficam em y = 1,0, ou seja, suas ego redes formam cliques "
            "completos. Aeroportos regionais e vizinhos se conectam integralmente entre si, "
            "enquanto os hubs, por ligarem toda a rede, reduzem a densidade local.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "O scatter plot permite comparar duas variáveis quantitativas ao mesmo tempo "
            "e destacar agrupamentos e valores atípicos sem impor ordem artificial.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "explr_dispersao_grau_densidade.png",
            "Figura 1. Dispersão grau × densidade ego por região",
            s,
        )
    )

    story.append(Paragraph("2.2 Matriz de conexões entre regiões", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> out/explr_matriz_regioes.png<br/>"
            "<b>Tipo:</b> heatmap (mapa de calor)<br/>"
            "O gráfico usa uma matriz 5×5 em que a célula (i, j) indica o número de "
            "arestas entre a região i e a região j. A diagonal corresponde às conexões "
            "intra regionais.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A diagonal concentra a maior parte das conexões, o que confirma os cliques "
            "regionais. Fora dela, as células mais intensas envolvem regiões com mais "
            "aeroportos, como Nordeste e Sudeste, que também se ligam com mais frequência "
            "aos hubs. Regiões menores, como Centro Oeste e Norte, têm menos arestas "
            "internas, mas alcançam o restante da rede principalmente por meio do hub BSB.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Heatmaps são adequados para matrizes de contagem entre categorias, pois a "
            "intensidade da cor transmite a magnitude de forma direta.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "explr_matriz_regioes.png",
            "Figura 2. Conexões entre regiões (heatmap)",
            s,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("3. Visualizações explanatórias", s["h1"]))
    story.append(
        Paragraph(
            "As visualizações desta seção foram pensadas para comunicar os resultados "
            "de forma clara a quem não trabalha com teoria de grafos.",
            s["body"],
        )
    )

    story.append(Paragraph("3.1 Dominância dos hubs na rede", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> out/expl_dominancia_hubs.png<br/>"
            "<b>Tipo:</b> barras horizontais ordenadas<br/>"
            "O gráfico mostra os 20 aeroportos em ordem crescente de grau. Hubs aparecem "
            "em vermelho e aeroportos regionais em azul. Uma anotação indica o percentual "
            "de grau total detido pelos hubs.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"BSB, GRU e GIG concentram a maior parte das conexões diretas da rede, pois "
            f"cada um se liga a todos os demais aeroportos. Juntos respondem por cerca de "
            f"{hub_pct}% do grau total. Se um hub deixar de operar, grande parte da malha "
            "perde rotas diretas e os aeroportos regionais passam a depender ainda mais "
            "deles para viagens inter regionais.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Barras horizontais ordenadas facilitam a leitura do ranking e a comparação "
            "entre extremos de conectividade.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "expl_dominancia_hubs.png",
            "Figura 3. Dominância dos hubs nacionais",
            s,
        )
    )

    story.append(Paragraph("3.2 Densidade das regiões vs. rede nacional", s["h2"]))
    story.append(
        Paragraph(
            "<b>Arquivo:</b> out/expl_densidade_regioes.png<br/>"
            "<b>Tipo:</b> barras verticais com linha de referência<br/>"
            "As barras representam a densidade de cada subgrafo regional; a linha "
            "tracejada indica a densidade global; as cores separam as regiões.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"Dentro de cada região todos os aeroportos se conectam diretamente, o que "
            f"resulta em densidade 1,0. Na rede nacional o valor cai para cerca de "
            f"{dens_global:.2f}. Na prática, voos entre aeroportos da mesma região podem "
            "ser feitos sem escala, mas viagens entre regiões distintas tendem a passar "
            "por um hub nacional.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Barras com linha de referência ajudam a comparar cada região com o patamar "
            "da rede completa, que é o ponto central da análise.",
            s["body"],
        )
    )
    story.extend(
        _figure(
            out_dir / "expl_densidade_regioes.png",
            "Figura 4. Densidade intra regional vs. rede nacional",
            s,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("4. Padrões identificados", s["h1"]))
    story.append(
        Paragraph(
            "A topologia segue um modelo hub and spoke: três aeroportos centrais funcionam "
            "como pontes inter regionais, enquanto os demais formam cliques locais.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "As ego redes dos aeroportos que não são hub correspondem a grafos completos "
            "(K<sub>n</sub>), o que garante redundância local, mas aumenta a dependência "
            "dos hubs em rotas mais longas.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "A conectividade inter regional passa quase toda pelos hubs, o que pode "
            "representar vulnerabilidade operacional.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            f"A densidade global baixa (cerca de {dens_global:.2f}) decorre da modelagem "
            "adotada: alta conectividade dentro de cada região somada a ligações "
            "centralizadas nos hubs, sem criar redundâncias desnecessárias entre "
            "aeroportos regionais de regiões diferentes.",
            s["body"],
        )
    )

    story.append(Paragraph("4.1 Síntese metodológica", s["h2"]))
    story.append(
        Paragraph(
            "Foram produzidas duas visualizações exploratórias (scatter e heatmap) e "
            "duas explanatórias (barras ordenadas e barras com referência), conforme o "
            "Requisito 10. O trabalho considera a modelagem descrita no README, as "
            "métricas calculadas (ordem, tamanho, densidade global e regional) e a "
            "interpretação consolidada em RELATORIO.md.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Comando de reprodução: python -m src.cli analise (gera PNGs em out/) e "
            "python -m src.gerar_pdf_avd (gera este PDF).",
            s["body"],
        )
    )

    return story


def gerar_pdf_avd(root: Path | None = None) -> Path:
    root = root or _project_root()
    out_dir = root / "out"
    output = root / "ANÁLISE EXPLORATÓRIA E EXPLANATÓRIA (completo).pdf"

    required = [
        "explr_dispersao_grau_densidade.png",
        "explr_matriz_regioes.png",
        "expl_dominancia_hubs.png",
        "expl_densidade_regioes.png",
        "global.json",
        "regioes.json",
    ]
    missing = [f for f in required if not (out_dir / f).exists()]
    if missing:
        raise FileNotFoundError(
            "Arquivo(s) ausente(s): " + ", ".join(missing) + ". "
            "Execute python -m src.cli analise e python -m src.cli metricas."
        )

    styles = _build_styles()
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Análise Exploratória e Explanatória",
        author="Projeto Grafos",
    )
    doc.build(build_story(styles, out_dir))
    return output


def main():
    path = gerar_pdf_avd()
    print(f"PDF gerado: {path}")


if __name__ == "__main__":
    main()
