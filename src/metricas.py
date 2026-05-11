"""
Parte 3 — Métricas globais e por grupo.

Funções puras de cálculo (sem I/O) + helpers de escrita.
Chamadas por ``src.solve`` e ``src.cli``.

Saídas:
  out/global.json          — ordem, tamanho, densidade do grafo completo
  out/regioes.json         — lista de métricas por região (subgrafos induzidos)
  out/ego_aeroportos.csv   — tabela: aeroporto, grau, ordem_ego, tamanho_ego, densidade_ego
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from src.graphs.graph import Graph


# ---------------------------------------------------------------------------
# Cálculos puros
# ---------------------------------------------------------------------------

def calc_densidade(ordem: int, tamanho: int) -> float:
    """
    Densidade de um grafo não-direcionado simples:
        2|E| / (|V| * (|V| - 1))
    Retorna 0.0 se |V| < 2.
    """
    if ordem < 2:
        return 0.0
    return (2 * tamanho) / (ordem * (ordem - 1))


def calc_global(grafo: Graph) -> dict[str, Any]:
    """Retorna ordem, tamanho e densidade do grafo completo."""
    ordem = grafo.num_nodes()
    tamanho = grafo.num_edges()
    return {
        "ordem": ordem,
        "tamanho": tamanho,
        "densidade": round(calc_densidade(ordem, tamanho), 6),
    }


def calc_regioes(grafo: Graph) -> list[dict[str, Any]]:
    """
    Subgrafos induzidos por região.

    Para cada região, considera apenas os nós daquela região e as arestas
    cujos dois extremos pertencem à mesma região.
    Retorna lista ordenada pelo nome da região.
    """
    # Agrupa IATAs por região
    nos_por_regiao: dict[str, set[str]] = {}
    for iata, node in grafo.nodes.items():
        nos_por_regiao.setdefault(node.regiao, set()).add(iata)

    resultado: list[dict[str, Any]] = []
    for regiao in sorted(nos_por_regiao):
        nos = nos_por_regiao[regiao]
        ordem = len(nos)
        tamanho = sum(
            1
            for edge in grafo.edges()
            if edge.origem in nos and edge.destino in nos
        )
        resultado.append(
            {
                "regiao": regiao,
                "aeroportos": sorted(nos),
                "ordem": ordem,
                "tamanho": tamanho,
                "densidade": round(calc_densidade(ordem, tamanho), 6),
            }
        )
    return resultado


def calc_ego(grafo: Graph) -> list[dict[str, Any]]:
    """
    Ego-subrede de cada aeroporto v: v ∪ N(v).

    Para cada vértice v calcula:
      - grau       = |N(v)|
      - ordem_ego  = |v ∪ N(v)|
      - tamanho_ego = arestas cujos dois extremos estão em v ∪ N(v)
      - densidade_ego

    Retorna lista ordenada por código IATA.
    """
    resultado: list[dict[str, Any]] = []
    for iata in sorted(grafo.nodes):
        vizinhos = [nb for nb, _ in grafo.neighbors(iata)]
        grau = len(vizinhos)

        nos_ego: set[str] = {iata} | set(vizinhos)
        ordem_ego = len(nos_ego)
        tamanho_ego = sum(
            1
            for edge in grafo.edges()
            if edge.origem in nos_ego and edge.destino in nos_ego
        )
        resultado.append(
            {
                "aeroporto": iata,
                "grau": grau,
                "ordem_ego": ordem_ego,
                "tamanho_ego": tamanho_ego,
                "densidade_ego": round(calc_densidade(ordem_ego, tamanho_ego), 6),
            }
        )
    return resultado


# ---------------------------------------------------------------------------
# I/O de saída
# ---------------------------------------------------------------------------

def _out_dir(root: Path | None = None) -> Path:
    base = root if root is not None else Path(__file__).resolve().parent.parent
    return base / "out"


def gravar_global_json(dados: dict[str, Any], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "global.json"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho


def gravar_regioes_json(dados: list[dict[str, Any]], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "regioes.json"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho


def gravar_ego_csv(dados: list[dict[str, Any]], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "ego_aeroportos.csv"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["aeroporto", "grau", "ordem_ego", "tamanho_ego", "densidade_ego"]
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dados)
    return caminho


# ---------------------------------------------------------------------------
# Função principal (chamada por solve.py / cli.py)
# ---------------------------------------------------------------------------

def run(grafo: Graph, root: Path | None = None) -> dict[str, Any]:
    """
    Executa todas as métricas da Parte 3 e grava os três arquivos de saída.

    Retorna um dicionário com as três estruturas calculadas.
    """
    global_data = calc_global(grafo)
    regioes_data = calc_regioes(grafo)
    ego_data = calc_ego(grafo)

    path_global = gravar_global_json(global_data, root)
    path_regioes = gravar_regioes_json(regioes_data, root)
    path_ego = gravar_ego_csv(ego_data, root)

    return {
        "global": global_data,
        "regioes": regioes_data,
        "ego": ego_data,
        "arquivos": {
            "global_json": str(path_global),
            "regioes_json": str(path_regioes),
            "ego_csv": str(path_ego),
        },
    }
