import pytest
from src.graphs.graph import Graph, Node, Edge
from src.graphs.algorithms import bfs


def _graph():
    g = Graph()
    for iata in ["A", "B", "C", "D", "E"]:
        g.add_node(Node(iata=iata, cidade=iata, regiao="Norte"))
    for a, b in [("A", "B"), ("A", "C"), ("B", "D"), ("C", "E")]:
        g.add_undirected_edge(
            Edge.from_endpoints(a, b, peso=1.0, tipo_conexao="t", justificativa="j")
        )
    return g


def test_bfs_layer_0():
    result = bfs(_graph(), "A")
    assert result["camadas"][0] == ["A"]


def test_bfs_layer_1():
    result = bfs(_graph(), "A")
    assert set(result["camadas"][1]) == {"B", "C"}


def test_bfs_layer_2():
    result = bfs(_graph(), "A")
    assert set(result["camadas"][2]) == {"D", "E"}


def test_bfs_visits_all_nodes():
    result = bfs(_graph(), "A")
    assert set(result["ordem_visita"]) == {"A", "B", "C", "D", "E"}


def test_bfs_distances():
    result = bfs(_graph(), "A")
    assert result["distancias"]["A"] == 0
    assert result["distancias"]["B"] == 1
    assert result["distancias"]["C"] == 1
    assert result["distancias"]["D"] == 2
    assert result["distancias"]["E"] == 2


def test_bfs_predecessors():
    result = bfs(_graph(), "A")
    assert result["predecessores"]["A"] is None
    assert result["predecessores"]["B"] == "A"
    assert result["predecessores"]["C"] == "A"


def test_bfs_invalid_source():
    with pytest.raises(ValueError):
        bfs(_graph(), "Z")
