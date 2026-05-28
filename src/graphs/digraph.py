"""
Grafo dirigido ponderado para a Parte 2 (rede de assistências NBA).

DiEdge  — aresta dirigida com weight (pontos gerados) e cost (1/weight).
DiGraph — lista de adjacência de saída e de entrada; lista de arestas para Bellman-Ford.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


@dataclass
class DiEdge:
    source: str
    target: str
    weight: float  # pontos gerados — sempre > 0
    cost: float    # 1/weight — custo para caminhos mínimos


class DiGraph:
    """Grafo dirigido ponderado com lista de adjacência dupla."""

    def __init__(self) -> None:
        self._nodes: set[str] = set()
        self._out_adj: dict[str, list[tuple[str, DiEdge]]] = {}
        self._in_adj: dict[str, list[tuple[str, DiEdge]]] = {}
        self._edges: list[DiEdge] = []

    # ------------------------------------------------------------------
    # Mutação
    # ------------------------------------------------------------------

    def add_node(self, node: str) -> None:
        if node not in self._nodes:
            self._nodes.add(node)
            self._out_adj[node] = []
            self._in_adj[node] = []

    def add_edge(self, edge: DiEdge) -> None:
        self.add_node(edge.source)
        self.add_node(edge.target)
        self._out_adj[edge.source].append((edge.target, edge))
        self._in_adj[edge.target].append((edge.source, edge))
        self._edges.append(edge)

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------

    @property
    def nodes(self) -> set[str]:
        return self._nodes

    def out_neighbors(self, node: str) -> list[tuple[str, DiEdge]]:
        return self._out_adj.get(node, [])

    def in_neighbors(self, node: str) -> list[tuple[str, DiEdge]]:
        return self._in_adj.get(node, [])

    def out_degree(self, node: str) -> int:
        return len(self._out_adj.get(node, []))

    def in_degree(self, node: str) -> int:
        return len(self._in_adj.get(node, []))

    def edges(self) -> list[DiEdge]:
        return self._edges

    def num_nodes(self) -> int:
        return len(self._nodes)

    def num_edges(self) -> int:
        return len(self._edges)

    # ------------------------------------------------------------------
    # Subgrafo
    # ------------------------------------------------------------------

    def induced_subgraph(self, nodes_subset: set[str]) -> DiGraph:
        sub = DiGraph()
        for node in nodes_subset:
            if node in self._nodes:
                sub.add_node(node)
        for edge in self._edges:
            if edge.source in nodes_subset and edge.target in nodes_subset:
                sub.add_edge(DiEdge(edge.source, edge.target, edge.weight, edge.cost))
        return sub


# ------------------------------------------------------------------
# Carregamento do CSV
# ------------------------------------------------------------------

def digraph_from_csv(path: Path) -> DiGraph:
    """Carrega nba_graph_final.csv e retorna um DiGraph."""
    g = DiGraph()
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            weight = float(row["weight"])
            cost = float(row["cost"])
            g.add_edge(DiEdge(
                source=row["source"].strip(),
                target=row["target"].strip(),
                weight=weight,
                cost=cost,
            ))
    return g
