from __future__ import annotations

import argparse
import sys
from pathlib import Path

def _cmd_gerar(root: Path | None) -> int:
    from src.graphs.io import write_adjacencias_aeroportos_csv, data_dir

    num_arestas = write_adjacencias_aeroportos_csv(root=root)
    from src.graphs.io import project_root

    base = root if root is not None else project_root()
    print(f"Gerado: {data_dir(base) / 'adjacencias_aeroportos.csv'} ({num_arestas} arestas)")
    return 0

def _cmd_validar(root: Path | None) -> int:
    from src.graphs.io import validate_modelagem

    stats = validate_modelagem(root=root)
    print(f"Conectado      : {stats['conectado']}")
    print(f"Nós (|V|)      : {stats['n']}")
    print(f"Arestas (|E|)  : {stats['m']}")
    print(f"Regiões        : {stats['regioes']}")
    print(f"Intra-regional : {stats['intra_regiao_ok']}")
    print(f"Inter-regional : {stats['arestas_inter_regionais']} arestas")
    print(f"Densidade      : {stats['densidade']:.4f}")
    print("Validação OK.")
    return 0

def _cmd_metricas(root: Path | None) -> int:
    from src.solve import solve_parte3

    solve_parte3(root=root, verbose=True)
    return 0

def _cmd_distancias(root: Path | None) -> int:
    from src.solve import solve_parte6

    solve_parte6(root=root, verbose=True)
    return 0

def _cmd_viz(root: Path | None) -> int:
    from src.graphs.graph import graph_from_csv_files
    from src.analise_visual import run_all_visualizations

    grafo = graph_from_csv_files(root=root)
    run_all_visualizations(grafo, root=root)
    return 0

def _cmd_parte2(root: Path | None) -> int:
    from src.parte2 import solve_parte2

    solve_parte2(root=root, verbose=True)
    return 0

def _cmd_analise(root: Path | None) -> int:
    from src.graphs.graph import graph_from_csv_files
    from src.analise_visual import gerar_analise_avd

    grafo = graph_from_csv_files(root=root)
    paths = gerar_analise_avd(grafo, root=root)
    for p in paths:
        print(f"  {p}")
    return 0

def _cmd_interativo(root: Path | None) -> int:
    from src.graphs.graph import graph_from_csv_files
    from src.analise_visual import gerar_grafo_interativo

    grafo = graph_from_csv_files(root=root)
    html_path = gerar_grafo_interativo(grafo, root=root)
    print(f"Grafo interativo gerado: {html_path}")
    return 0

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m src.cli",
        description="Projeto Grafos — Rede de Aeroportos do Brasil",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=None,
        metavar="PATH",
        help="Raiz do repositório (padrão: detectado automaticamente)",
    )
    subparsers = parser.add_subparsers(dest="cmd", required=True)

                   
    subparsers.add_parser(
        "gerar",
        help="Gera data/adjacencias_aeroportos.csv a partir do modelo interno",
    )

                     
    subparsers.add_parser(
        "validar",
        help="Valida aeroportos_data.csv + adjacencias_aeroportos.csv",
    )

                      
    subparsers.add_parser(
        "metricas",
        help=(
            "Partes 3 e 4: calcula ordem/tamanho/densidade do grafo completo, "
            "subgrafos por região, ego-subredes e rankings de grau"
        ),
    )

                        
    subparsers.add_parser(
        "distancias",
        help=(
            "Parte 6: calcula menor caminho (Dijkstra) para cada par "
            "em data/rotas.csv e grava out/distancias_rotas.csv"
        ),
    )

                 
    subparsers.add_parser(
        "viz",
        help="Gera visualizações estáticas e análises (Requisitos 7 e 8) + HTML interativo (Req 9)",
    )

                        
    subparsers.add_parser(
        "interativo",
        help="Req 9: gera apenas out/grafo_interativo.html (pyvis)",
    )

                    
    subparsers.add_parser(
        "parte2",
        help=(
            "Parte 2: executa BFS/DFS/Dijkstra/Bellman-Ford sobre o grafo NBA, "
            "gera visualizações e out/parte2_report.json"
        ),
    )

                     
    subparsers.add_parser(
        "analise",
        help="Req 10: gera visualizações exploratórias e explanatórias (AVD)",
    )

    args = parser.parse_args(argv)
    root: Path | None = args.root.resolve() if args.root else None

    dispatch = {
        "gerar": _cmd_gerar,
        "validar": _cmd_validar,
        "metricas": _cmd_metricas,
        "distancias": _cmd_distancias,
        "viz": _cmd_viz,
        "interativo": _cmd_interativo,
        "parte2": _cmd_parte2,
        "analise": _cmd_analise,
    }
    return dispatch[args.cmd](root)

if __name__ == "__main__":
    sys.exit(main())
