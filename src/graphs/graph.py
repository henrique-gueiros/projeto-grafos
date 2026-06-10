from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from . import io

@dataclass(frozen=True)
class Node:

    iata: str
    cidade: str
    regiao: str

@dataclass
class Edge:

    origem: str
    destino: str
    peso: float
    tipo_conexao: str
    justificativa: str

    @staticmethod
    def from_endpoints(
        iata_a: str,
        iata_b: str,
        *,
        peso: float,
        tipo_conexao: str,
        justificativa: str,
    ) -> Edge:
        origem, destino = sorted((iata_a, iata_b))
        return Edge(
            origem=origem,
            destino=destino,
            peso=peso,
            tipo_conexao=tipo_conexao,
            justificativa=justificativa,
        )

class Graph:

    def __init__(self) -> None:
        self._nodes: dict[str, Node] = {}
        self._edges: dict[tuple[str, str], Edge] = {}
        self._adjacency: dict[str, list[tuple[str, Edge]]] = {}

    @property
    def nodes(self) -> dict[str, Node]:
        return self._nodes

    def add_node(self, node: Node) -> None:
        if node.iata in self._nodes:
            raise ValueError(f"Nó duplicado: {node.iata}")
        self._nodes[node.iata] = node
        self._adjacency.setdefault(node.iata, [])

    def add_undirected_edge(self, edge: Edge) -> None:
        edge_key = (edge.origem, edge.destino)
        if edge_key in self._edges:
            raise ValueError(f"Aresta duplicada: {edge.origem}-{edge.destino}")
        if edge.origem not in self._nodes or edge.destino not in self._nodes:
            raise ValueError("Ambos os extremos devem existir como nós antes da aresta")
        self._edges[edge_key] = edge
        self._adjacency[edge.origem].append((edge.destino, edge))
        self._adjacency[edge.destino].append((edge.origem, edge))

    def neighbors(self, iata: str) -> Iterator[tuple[str, Edge]]:
        for neighbor_iata, edge in self._adjacency.get(iata, ()):
            yield neighbor_iata, edge

    def edges(self) -> Iterator[Edge]:
        return iter(self._edges.values())

    def num_nodes(self) -> int:
        return len(self._nodes)

    def num_edges(self) -> int:
        return len(self._edges)

    def is_connected(self) -> bool:
        if not self._nodes:
            return True
        start = next(iter(sorted(self._nodes.keys())))
        seen: set[str] = {start}
        queue: deque[str] = deque([start])
        while queue:
            current = queue.popleft()
            for neighbor_iata, _edge in self.neighbors(current):
                if neighbor_iata not in seen:
                    seen.add(neighbor_iata)
                    queue.append(neighbor_iata)
        return len(seen) == len(self._nodes)

def graph_from_model_files(*, root: Path | None = None) -> Graph:
    airport_rows = io.load_airport_rows(root=root)
    graph = Graph()
    for row in airport_rows:
        graph.add_node(
            Node(
                iata=row["iata"],
                cidade=row["cidade"],
                regiao=row["regiao"],
            )
        )
    for edge_dict in io.build_adjacencias_edges(airport_rows).values():
        graph.add_undirected_edge(
            Edge(
                origem=edge_dict["origem"],
                destino=edge_dict["destino"],
                peso=float(edge_dict["peso"]),
                tipo_conexao=edge_dict["tipo_conexao"],
                justificativa=edge_dict["justificativa"],
            )
        )
    return graph

def graph_from_csv_files(*, root: Path | None = None) -> Graph:
    airport_rows = io.load_airport_rows(root=root)
    graph = Graph()
    for row in airport_rows:
        graph.add_node(
            Node(
                iata=row["iata"],
                cidade=row["cidade"],
                regiao=row["regiao"],
            )
        )
    for row in io.load_adjacencia_rows(root=root):
        graph.add_undirected_edge(
            Edge(
                origem=row["origem"],
                destino=row["destino"],
                peso=float(row["peso"]),
                tipo_conexao=row["tipo_conexao"],
                justificativa=row["justificativa"],
            )
        )
    return graph
