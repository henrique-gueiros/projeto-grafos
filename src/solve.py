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
    Partes 3 e 4 — Métricas globais, por grupo e rankings de grau.

    Constrói o grafo a partir dos CSVs em disco e calcula:
      - Grafo completo : ordem, tamanho, densidade  → out/global.json
      - Subgrafos por região                        → out/regioes.json
      - Ego-subredes por aeroporto                  → out/ego_aeroportos.csv
      - Graus e rankings                            → out/graus.csv

    Parâmetros
    ----------
    root : Path | None
        Raiz do repositório. ``None`` → detectado automaticamente.
    verbose : bool
        Se True, imprime resumo no stdout.

    Retorna
    -------
    dict com chaves ``global``, ``regioes``, ``ego``, ``rankings``, ``arquivos``.
    """
    grafo = graph_from_csv_files(root=root)
    resultado = _metricas.run(grafo, root)

    if verbose:
        _print_parte3(resultado)
        _print_parte4(resultado)

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


def _print_parte4(resultado: dict[str, Any]) -> None:
    rankings = resultado["rankings"]
    graus = rankings["graus"]

    print("\n" + "=" * 62)
    print("PARTE 4 — Graus e rankings")
    print("=" * 62)

    print(f"\n[1] Lista de graus (ordem decrescente)")
    print(f"  {'IATA':<6} {'Grau':>5}")
    print("  " + "-" * 13)
    for row in graus:
        print(f"  {row['aeroporto']:<6} {row['grau']:>5}")

    mais = ", ".join(rankings["mais_conectado"])
    print(f"\n[2] Aeroporto mais conectado (maior grau = {rankings['grau_maximo']}):")
    print(f"    {mais}")

    dens_apts = ", ".join(rankings["maior_densidade_local"])
    print(
        f"\n[3] Aeroporto com maior densidade local"
        f" (densidade_ego = {rankings['densidade_local_maxima']:.6f}):"
    )
    print(f"    {dens_apts}")
