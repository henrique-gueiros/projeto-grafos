"""
Algoritmos para grafo dirigido (Parte 2).

BFS, DFS, Dijkstra e Bellman-Ford — implementações próprias sem libs de grafos.
Usa apenas heapq (stdlib) no Dijkstra.
"""

from __future__ import annotations

import heapq
from collections import deque
from typing import Callable

from src.graphs.digraph import DiGraph, DiEdge


# ---------------------------------------------------------------------------
# BFS Dirigido
# ---------------------------------------------------------------------------

def bfs_directed(
    digraph: DiGraph,
    source: str,
) -> tuple[list[str], list[list[str]], dict[str, str | None]]:
    """
    BFS em grafo dirigido percorrendo apenas arestas de saída.

    Retorna
    -------
    (order, layers, parent)
        order  : lista de nós na ordem de descoberta
        layers : layers[k] = lista de nós a distância exata k de source
        parent : predecessor de cada nó (None para a source)
    """
    if source not in digraph.nodes:
        raise ValueError(f"Nó fonte não encontrado: {source}")

    visited: set[str] = {source}
    parent: dict[str, str | None] = {source: None}
    order: list[str] = []
    layers: list[list[str]] = []
    current_layer = [source]

    while current_layer:
        layers.append(current_layer[:])
        order.extend(current_layer)
        next_layer: list[str] = []
        for node in current_layer:
            for neighbor, _edge in digraph.out_neighbors(node):
                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = node
                    next_layer.append(neighbor)
        current_layer = next_layer

    return order, layers, parent


# ---------------------------------------------------------------------------
# DFS Dirigido
# ---------------------------------------------------------------------------

def dfs_directed(
    digraph: DiGraph,
    source: str,
) -> tuple[
    list[str],
    dict[str, int],
    dict[str, int],
    dict[str, str | None],
    dict[tuple[str, str], str],
    bool,
]:
    """
    DFS iterativo em grafo dirigido percorrendo apenas arestas de saída.

    Classifica cada aresta como 'tree', 'back', 'forward' ou 'cross'.
    Uma aresta 'back' indica a presença de ciclo.

    Retorna
    -------
    (order, disc, fin, parent, edge_types, has_cycle)
        order      : nós na ordem de descoberta
        disc       : tempo de descoberta de cada nó
        fin        : tempo de finalização de cada nó
        parent     : predecessor na árvore DFS (None para a raiz)
        edge_types : dict (u, v) -> 'tree'|'back'|'forward'|'cross'
        has_cycle  : True se pelo menos uma aresta back foi encontrada
    """
    if source not in digraph.nodes:
        raise ValueError(f"Nó fonte não encontrado: {source}")

    WHITE, GRAY, BLACK = 0, 1, 2

    color: dict[str, int] = {n: WHITE for n in digraph.nodes}
    disc: dict[str, int] = {}
    fin: dict[str, int] = {}
    parent: dict[str, str | None] = {source: None}
    edge_types: dict[tuple[str, str], str] = {}
    has_cycle = False
    order: list[str] = []
    timer = [0]

    color[source] = GRAY
    disc[source] = timer[0]
    timer[0] += 1
    order.append(source)

    # Pilha: (nó, iterador sobre out_neighbors)
    stack: list[tuple[str, object]] = [
        (source, iter(digraph.out_neighbors(source)))
    ]

    while stack:
        u, nbrs = stack[-1]
        try:
            v, _edge = next(nbrs)  # type: ignore[arg-type]
            if color[v] == WHITE:
                color[v] = GRAY
                disc[v] = timer[0]
                timer[0] += 1
                parent[v] = u
                order.append(v)
                edge_types[(u, v)] = "tree"
                stack.append((v, iter(digraph.out_neighbors(v))))
            elif color[v] == GRAY:
                edge_types[(u, v)] = "back"
                has_cycle = True
            else:  # BLACK
                if disc.get(u, -1) < disc.get(v, -1):
                    edge_types[(u, v)] = "forward"
                else:
                    edge_types[(u, v)] = "cross"
        except StopIteration:
            u_node, _ = stack.pop()
            color[u_node] = BLACK
            fin[u_node] = timer[0]
            timer[0] += 1

    return order, disc, fin, parent, edge_types, has_cycle


# ---------------------------------------------------------------------------
# Dijkstra Dirigido
# ---------------------------------------------------------------------------

def dijkstra_directed(
    digraph: DiGraph,
    source: str,
    target: str | None = None,
) -> tuple[dict[str, float], dict[str, str | None]]:
    """
    Dijkstra em grafo dirigido usando edge.cost (sempre positivo) como peso.

    Parâmetros
    ----------
    target : str | None
        Early-stop quando o custo mínimo até target for determinado.

    Retorna
    -------
    (dist, prev)
        dist : distâncias mínimas de source a todos os nós alcançáveis
        prev : predecessor de cada nó no caminho mínimo
    """
    if source not in digraph.nodes:
        raise ValueError(f"Nó fonte não encontrado: {source}")

    dist: dict[str, float] = {n: float("inf") for n in digraph.nodes}
    prev: dict[str, str | None] = {n: None for n in digraph.nodes}
    dist[source] = 0.0

    heap: list[tuple[float, str]] = [(0.0, source)]
    visited: set[str] = set()

    while heap:
        d, u = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)

        if target is not None and u == target:
            break

        for v, edge in digraph.out_neighbors(u):
            if v in visited:
                continue
            nd = d + edge.cost
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(heap, (nd, v))

    return dist, prev


def reconstruir_caminho_di(
    prev: dict[str, str | None],
    source: str,
    target: str,
) -> list[str] | None:
    """Reconstrói caminho mínimo a partir do dicionário prev."""
    if prev.get(target) is None and target != source:
        return None
    path: list[str] = []
    cur: str | None = target
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()
    return path if path[0] == source else None


# ---------------------------------------------------------------------------
# Bellman-Ford
# ---------------------------------------------------------------------------

def bellman_ford(
    digraph: DiGraph,
    source: str,
    weight_fn: Callable[[DiEdge], float] | None = None,
) -> tuple[dict[str, float], dict[str, str | None], bool, set[str]]:
    """
    Bellman-Ford em grafo dirigido.

    Suporta pesos negativos; detecta ciclos negativos.

    Parâmetros
    ----------
    weight_fn : callable | None
        Função (DiEdge) -> float que define o peso da aresta.
        Se None, usa edge.cost.

    Retorna
    -------
    (dist, prev, has_negative_cycle, neg_cycle_nodes)
        dist               : distâncias mínimas (podem ser -inf se afetadas por ciclo neg.)
        prev               : predecessores
        has_negative_cycle : True se foi detectado ciclo negativo
        neg_cycle_nodes    : conjunto de nós afetados pelo ciclo negativo
    """
    if source not in digraph.nodes:
        raise ValueError(f"Nó fonte não encontrado: {source}")

    if weight_fn is None:
        weight_fn = lambda e: e.cost

    nodes = list(digraph.nodes)
    n = len(nodes)
    edges = digraph.edges()

    dist: dict[str, float] = {nd: float("inf") for nd in nodes}
    prev: dict[str, str | None] = {nd: None for nd in nodes}
    dist[source] = 0.0

    # n-1 relaxamentos
    for _ in range(n - 1):
        updated = False
        for edge in edges:
            u, v = edge.source, edge.target
            if dist[u] == float("inf"):
                continue
            w = weight_fn(edge)
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                updated = True
        if not updated:
            break

    # n-ésima iteração: detectar ciclo negativo
    neg_cycle_nodes: set[str] = set()
    has_negative_cycle = False

    for edge in edges:
        u, v = edge.source, edge.target
        if dist[u] == float("inf"):
            continue
        w = weight_fn(edge)
        if dist[u] + w < dist[v]:
            has_negative_cycle = True
            neg_cycle_nodes.add(u)
            neg_cycle_nodes.add(v)

    return dist, prev, has_negative_cycle, neg_cycle_nodes
