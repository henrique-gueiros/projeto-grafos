from __future__ import annotations

from pathlib import Path
from typing import Any

from src.graphs.graph import graph_from_csv_files
from src import metricas as _metricas
from src import distancias as _distancias

def solve_parte3(root: Path | None = None, *, verbose: bool = True) -> dict[str, Any]:
    grafo = graph_from_csv_files(root=root)
    resultado = _metricas.run(grafo, root)

    if verbose:
        _print_parte3(resultado)
        _print_parte4(resultado)

    return resultado

                                                                             
                     
                                                                             

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

def solve_parte6(root: Path | None = None, *, verbose: bool = True) -> dict[str, Any]:
    grafo = graph_from_csv_files(root=root)
    resultado = _distancias.run(grafo, root)

    if verbose:
        _print_parte6(resultado)

    return resultado

def _print_parte6(resultado: dict[str, Any]) -> None:
    distancias = resultado["distancias"]
    arquivo = resultado["arquivo"]

    print("=" * 62)
    print("PARTE 6 — Distância entre aeroportos (Dijkstra)")
    print("=" * 62)

    print(f"\n  {'Origem':<6} {'Destino':<8} {'Custo':>8}  Caminho")
    print("  " + "-" * 56)
    for r in distancias:
        custo_str = f"{r['custo']:>8}" if r['custo'] != 'inf' else '     inf'
        print(f"  {r['origem']:<6} {r['destino']:<8} {custo_str}  {r['caminho']}")

    print(f"\nArquivo gerado: {arquivo}")
