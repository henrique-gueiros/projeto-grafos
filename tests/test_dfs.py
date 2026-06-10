import pytest
from src.graphs.graph import Graph, Node, Edge
from src.graphs.algorithms import dfs

def _tree():
    g = Graph()
    for iata in ["A", "B", "C", "D"]:
        g.add_node(Node(iata=iata, cidade=iata, regiao="Norte"))
    for a, b in [("A", "B"), ("A", "C"), ("B", "D")]:
        g.add_undirected_edge(
            Edge.from_endpoints(a, b, peso=1.0, tipo_conexao="t", justificativa="j")
        )
    return g

def _cycle():
    g = Graph()
    for iata in ["A", "B", "C"]:
        g.add_node(Node(iata=iata, cidade=iata, regiao="Norte"))
    for a, b in [("A", "B"), ("B", "C"), ("A", "C")]:
        g.add_undirected_edge(
            Edge.from_endpoints(a, b, peso=1.0, tipo_conexao="t", justificativa="j")
        )
    return g

def test_dfs_tree_no_cycle():
    result = dfs(_tree(), "A")
    assert not result["tem_ciclo"]
    assert len(result["arestas_retorno"]) == 0

def test_dfs_cycle_detected():
    result = dfs(_cycle(), "A")
    assert result["tem_ciclo"]
    assert len(result["arestas_retorno"]) > 0

def test_dfs_visits_all_nodes():
    result = dfs(_tree(), "A")
    assert set(result["ordem_visita"]) == {"A", "B", "C", "D"}

def test_dfs_tree_edge_count():
    result = dfs(_tree(), "A")
    assert len(result["arestas_arvore"]) == 3

def test_dfs_tree_edges_classification():
    result = dfs(_tree(), "A")
    tree_pairs = {frozenset(e) for e in result["arestas_arvore"]}
    assert frozenset({"A", "B"}) in tree_pairs
    assert frozenset({"A", "C"}) in tree_pairs
    assert frozenset({"B", "D"}) in tree_pairs

def test_dfs_invalid_source():
    with pytest.raises(ValueError):
        dfs(_tree(), "Z")
