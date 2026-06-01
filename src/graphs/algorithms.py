"""
Implementação própria dos algoritmos de grafos.

BFS, DFS, Dijkstra e Bellman-Ford — sem uso de bibliotecas externas
que já implementem esses algoritmos (conforme regra do projeto).
Usa apenas ``heapq`` (fila de prioridade da stdlib) para Dijkstra.
"""

from __future__ import annotations

import heapq
from collections import deque
from typing import Any

from src.graphs.graph import Graph


# ---------------------------------------------------------------------------
# BFS — Busca em Largura
# ---------------------------------------------------------------------------

def bfs(grafo: Graph, origem: str) -> dict[str, Any]:
    """
    BFS a partir de ``origem``.

    Retorna
    -------
    dict com:
      - ordem_visita : list[str]
      - distancias   : dict[str, int]  (número de arestas até a origem)
      - predecessores: dict[str, str|None]
      - camadas      : list[list[str]]  (camadas BFS por nível)
    """
    if origem not in grafo.nodes:
        raise ValueError(f"Nó de origem não existe: '{origem}'")

    dist: dict[str, int] = {origem: 0}
    predecessores: dict[str, str | None] = {origem: None}
    ordem_visita: list[str] = [origem]
    fila: deque[str] = deque([origem])

    while fila:
        u = fila.popleft()
        for vizinho, _edge in grafo.neighbors(u):
            if vizinho not in dist:
                dist[vizinho] = dist[u] + 1
                predecessores[vizinho] = u
                ordem_visita.append(vizinho)
                fila.append(vizinho)

    max_layer = max(dist.values()) if dist else 0
    camadas: list[list[str]] = [[] for _ in range(max_layer + 1)]
    for node, layer in dist.items():
        camadas[layer].append(node)

    return {
        "ordem_visita": ordem_visita,
        "distancias": dist,
        "predecessores": predecessores,
        "camadas": camadas,
    }


# ---------------------------------------------------------------------------
# DFS — Busca em Profundidade (iterativo)
# ---------------------------------------------------------------------------

def dfs(grafo: Graph, origem: str) -> dict[str, Any]:
    """
    DFS iterativo a partir de ``origem`` (evita estouro de pilha em grafos grandes).

    Retorna
    -------
    dict com:
      - ordem_visita  : list[str]
      - predecessores : dict[str, str|None]
      - arestas_arvore: list[tuple[str,str]]  (tree edges)
      - arestas_retorno: list[tuple[str,str]] (back edges — indicam ciclos)
      - tem_ciclo     : bool
    """
    if origem not in grafo.nodes:
        raise ValueError(f"Nó de origem não existe: '{origem}'")

    visitado: set[str] = set()
    ordem_visita: list[str] = []
    predecessores: dict[str, str | None] = {origem: None}
    arestas_arvore: list[tuple[str, str]] = []
    arestas_retorno: list[tuple[str, str]] = []

    # Pilha: (nó, índice_do_próximo_vizinho_a_processar)
    vizinhos_cache: dict[str, list[tuple[str, Any]]] = {}
    stack: list[tuple[str, int]] = [(origem, 0)]
    em_pilha: set[str] = {origem}

    while stack:
        u, idx = stack[-1]

        if u not in visitado:
            visitado.add(u)
            ordem_visita.append(u)
            vizinhos_cache[u] = list(grafo.neighbors(u))

        vizinhos = vizinhos_cache[u]

        if idx < len(vizinhos):
            vizinho, _edge = vizinhos[idx]
            stack[-1] = (u, idx + 1)

            if vizinho not in visitado:
                predecessores[vizinho] = u
                arestas_arvore.append((u, vizinho))
                em_pilha.add(vizinho)
                stack.append((vizinho, 0))
            elif vizinho in em_pilha and predecessores.get(u) != vizinho:
                arestas_retorno.append((u, vizinho))
        else:
            em_pilha.discard(u)
            stack.pop()

    return {
        "ordem_visita": ordem_visita,
        "predecessores": predecessores,
        "arestas_arvore": arestas_arvore,
        "arestas_retorno": arestas_retorno,
        "tem_ciclo": len(arestas_retorno) > 0,
    }


# ---------------------------------------------------------------------------
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

    for edge in grafo.edges():
        if edge.peso < 0:
            raise ValueError(
                f"Dijkstra requer pesos >= 0; aresta {edge.origem}-{edge.destino} "
                f"tem peso {edge.peso}"
            )

    dist: dict[str, float] = {iata: float("inf") for iata in grafo.nodes}
    prev: dict[str, str | None] = {iata: None for iata in grafo.nodes}
    dist[origem] = 0.0

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
