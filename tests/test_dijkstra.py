import pytest
from src.graphs.graph import Graph, Node, Edge
from src.graphs.algorithms import dijkstra, dijkstra_caminho


def _graph():
    g = Graph()
    for iata in ["A", "B", "C", "D"]:
        g.add_node(Node(iata=iata, cidade=iata, regiao="Norte"))
    for a, b, w in [("A", "B", 1.0), ("A", "C", 4.0), ("B", "C", 2.0), ("B", "D", 5.0), ("C", "D", 1.0)]:
        g.add_undirected_edge(
            Edge.from_endpoints(a, b, peso=w, tipo_conexao="t", justificativa="j")
        )
    return g


def test_dijkstra_shortest_path():
    custo, caminho = dijkstra_caminho(_graph(), "A", "D")
    assert custo == 4.0
    assert caminho == ["A", "B", "C", "D"]


def test_dijkstra_prefers_indirect_shorter():
    custo, caminho = dijkstra_caminho(_graph(), "A", "C")
    assert custo == 3.0
    assert caminho == ["A", "B", "C"]


def test_dijkstra_same_source_dest():
    custo, caminho = dijkstra_caminho(_graph(), "A", "A")
    assert custo == 0.0
    assert caminho == ["A"]


def test_dijkstra_no_path():
    g = Graph()
    g.add_node(Node(iata="A", cidade="A", regiao="Norte"))
    g.add_node(Node(iata="Z", cidade="Z", regiao="Norte"))
    custo, caminho = dijkstra_caminho(g, "A", "Z")
    assert custo == float("inf")
    assert caminho is None


def test_dijkstra_all_distances():
    dist, _ = dijkstra(_graph(), "A")
    assert dist["A"] == 0.0
    assert dist["B"] == 1.0
    assert dist["C"] == 3.0
    assert dist["D"] == 4.0


def test_dijkstra_rejects_negative_weight():
    g = Graph()
    for iata in ["A", "B"]:
        g.add_node(Node(iata=iata, cidade=iata, regiao="Norte"))
    g.add_undirected_edge(
        Edge.from_endpoints("A", "B", peso=-1.0, tipo_conexao="t", justificativa="j")
    )
    with pytest.raises(ValueError, match="pesos >= 0"):
        dijkstra(g, "A")


def test_dijkstra_invalid_source():
    with pytest.raises(ValueError):
        dijkstra(_graph(), "Z")
