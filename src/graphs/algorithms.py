"""
Implementação própria dos algoritmos de grafos.

BFS, DFS, Dijkstra e Bellman-Ford — sem uso de bibliotecas externas
que já implementem esses algoritmos (conforme regra do projeto).
Usa apenas ``heapq`` (fila de prioridade da stdlib) para Dijkstra.
"""

from __future__ import annotations

import heapq
from typing import Any

from src.graphs.graph import Graph


# ---------------------------------------------------------------------------
# Dijkstra — menor caminho com pesos não-negativos
# ---------------------------------------------------------------------------

def dijkstra(
    grafo: Graph,
    origem: str,
    destino: str | None = None,
) -> tuple[dict[str, float], dict[str, str | None]]:
    """
    Algoritmo de Dijkstra (implementação própria com min-heap).

    Parâmetros
    ----------
    grafo : Graph
        Grafo não-direcionado ponderado (pesos ≥ 0).
    origem : str
        IATA do nó de partida.
    destino : str | None
        Se fornecido, encerra assim que o custo mínimo até ``destino``
        for determinado (otimização early-stop).

    Retorna
    -------
    (dist, prev)
        dist : dict[str, float]
            Distância mínima de ``origem`` até cada nó alcançável.
        prev : dict[str, str | None]
            Predecessor de cada nó no caminho mínimo (None para a origem).

    Levanta
    -------
    ValueError
        Se ``origem`` não existir no grafo.
    """
    if origem not in grafo.nodes:
        raise ValueError(f"Nó de origem não existe: {origem}")

    dist: dict[str, float] = {iata: float("inf") for iata in grafo.nodes}
    prev: dict[str, str | None] = {iata: None for iata in grafo.nodes}
    dist[origem] = 0.0

    # Min-heap: (custo_acumulado, iata)
    heap: list[tuple[float, str]] = [(0.0, origem)]
    visitado: set[str] = set()

    while heap:
        custo_atual, u = heapq.heappop(heap)

        if u in visitado:
            continue
        visitado.add(u)

        # Early-stop se só precisamos do destino
        if destino is not None and u == destino:
            break

        for vizinho, edge in grafo.neighbors(u):
            if vizinho in visitado:
                continue
            novo_custo = custo_atual + edge.peso
            if novo_custo < dist[vizinho]:
                dist[vizinho] = novo_custo
                prev[vizinho] = u
                heapq.heappush(heap, (novo_custo, vizinho))

    return dist, prev


def reconstruir_caminho(
    prev: dict[str, str | None],
    origem: str,
    destino: str,
) -> list[str] | None:
    """
    Reconstrói o caminho mínimo a partir do dicionário de predecessores.

    Retorna a lista de IATAs do caminho (ex.: ["REC", "GRU", "POA"])
    ou ``None`` se não houver caminho.
    """
    if prev.get(destino) is None and destino != origem:
        return None  # sem caminho

    caminho: list[str] = []
    atual: str | None = destino
    while atual is not None:
        caminho.append(atual)
        atual = prev[atual]
    caminho.reverse()
    return caminho


def dijkstra_caminho(
    grafo: Graph,
    origem: str,
    destino: str,
) -> tuple[float, list[str] | None]:
    """
    Atalho: retorna (custo, caminho) entre origem e destino usando Dijkstra.

    Retorna (inf, None) se não houver caminho.
    """
    dist, prev = dijkstra(grafo, origem, destino)
    custo = dist.get(destino, float("inf"))
    if custo == float("inf"):
        return custo, None
    caminho = reconstruir_caminho(prev, origem, destino)
    return custo, caminho
