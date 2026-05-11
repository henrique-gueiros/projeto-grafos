"""
solve.py — Orquestrador de todas as partes do projeto.

Cada função ``solve_parteN`` executa uma etapa completa e retorna seus
resultados. Chamado diretamente por ``cli.py``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.graphs.graph import graph_from_csv_files
from src import metricas as _metricas


def solve_parte3(root: Path | None = None, *, verbose: bool = True) -> dict[str, Any]:
    """
    Parte 3 — Métricas globais e por grupo.

    Constrói o grafo a partir dos CSVs em disco e calcula:
      - Grafo completo : ordem, tamanho, densidade  → out/global.json
      - Subgrafos por região                        → out/regioes.json
      - Ego-subredes por aeroporto                  → out/ego_aeroportos.csv

    Parâmetros
    ----------
    root : Path | None
        Raiz do repositório. ``None`` → detectado automaticamente.
    verbose : bool
        Se True, imprime resumo no stdout.

    Retorna
    -------
    dict com chaves ``global``, ``regioes``, ``ego``, ``arquivos``.
    """
    grafo = graph_from_csv_files(root=root)
    resultado = _metricas.run(grafo, root)

    if verbose:
        _print_parte3(resultado)

    return resultado


# ---------------------------------------------------------------------------
# Impressão formatada
# ---------------------------------------------------------------------------

def _print_parte3(resultado: dict[str, Any]) -> None:
    g = resultado["global"]
    regioes = resultado["regioes"]
    ego = resultado["ego"]
    arquivos = resultado["arquivos"]

    print("=" * 62)
    print("PARTE 3 — Métricas globais e por grupo")
    print("=" * 62)

    print(f"\n[1] Grafo completo")
    print(f"    Ordem   |V| : {g['ordem']}")
    print(f"    Tamanho |E| : {g['tamanho']}")
    print(f"    Densidade   : {g['densidade']:.6f}")

    print(f"\n[2] Métricas por região (subgrafos induzidos)")
    hdr = f"  {'Região':<15} {'|V|':>4} {'|E|':>5} {'Densidade':>12}  Aeroportos"
    print(hdr)
    print("  " + "-" * (len(hdr) - 2 + 10))
    for r in regioes:
        apts = ", ".join(r["aeroportos"])
        print(
            f"  {r['regiao']:<15} {r['ordem']:>4} {r['tamanho']:>5}"
            f" {r['densidade']:>12.6f}  [{apts}]"
        )

    print(f"\n[3] Ego-subredes por aeroporto")
    print(f"  {'IATA':<6} {'Grau':>5} {'Ord.Ego':>8} {'Tam.Ego':>8} {'Dens.Ego':>12}")
    print("  " + "-" * 45)
    for row in ego:
        print(
            f"  {row['aeroporto']:<6} {row['grau']:>5}"
            f" {row['ordem_ego']:>8} {row['tamanho_ego']:>8}"
            f" {row['densidade_ego']:>12.6f}"
        )

    print(f"\nArquivos gerados:")
    for nome, caminho in arquivos.items():
        print(f"  [{nome}]  {caminho}")
