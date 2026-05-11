"""
cli.py — Interface de linha de comando do projeto.

Uso geral:
    python -m src.cli <subcomando> [--root PATH]

Subcomandos disponíveis:
    gerar       Gera data/adjacencias_aeroportos.csv a partir do modelo
    validar     Valida aeroportos_data.csv + adjacencias_aeroportos.csv
    metricas    Parte 3: calcula e grava métricas globais e por grupo

Exemplos:
    python -m src.cli gerar
    python -m src.cli validar
    python -m src.cli metricas
    python -m src.cli metricas --root /caminho/para/projeto
"""

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

    # --- gerar ---
    subparsers.add_parser(
        "gerar",
        help="Gera data/adjacencias_aeroportos.csv a partir do modelo interno",
    )

    # --- validar ---
    subparsers.add_parser(
        "validar",
        help="Valida aeroportos_data.csv + adjacencias_aeroportos.csv",
    )

    # --- metricas ---
    subparsers.add_parser(
        "metricas",
        help=(
            "Parte 3: calcula ordem/tamanho/densidade do grafo completo, "
            "subgrafos por região e ego-subredes por aeroporto"
        ),
    )

    args = parser.parse_args(argv)
    root: Path | None = args.root.resolve() if args.root else None

    dispatch = {
        "gerar": _cmd_gerar,
        "validar": _cmd_validar,
        "metricas": _cmd_metricas,
    }
    return dispatch[args.cmd](root)


if __name__ == "__main__":
    sys.exit(main())
