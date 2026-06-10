import pytest
from src.graphs.digraph import DiGraph, DiEdge
from src.graphs.digraph_algorithms import bellman_ford


def _linear():
    g = DiGraph()
    for e in [
        DiEdge("A", "B", weight=10, cost=1.0),
        DiEdge("B", "C", weight=10, cost=2.0),
        DiEdge("A", "C", weight=10, cost=5.0),
    ]:
        g.add_edge(e)
    return g


def _negative_no_cycle():
    g = DiGraph()
    for e in [
        DiEdge("A", "B", weight=1, cost=3.0),
        DiEdge("A", "C", weight=1, cost=10.0),
        DiEdge("B", "C", weight=1, cost=-4.0),
    ]:
        g.add_edge(e)
    return g


def _negative_cycle():
    g = DiGraph()
    for e in [
        DiEdge("A", "B", weight=1, cost=1.0),
        DiEdge("B", "C", weight=1, cost=-3.0),
        DiEdge("C", "A", weight=1, cost=1.0),
    ]:
        g.add_edge(e)
    return g


def test_bf_shortest_path():
    dist, prev, neg_cycle, _ = bellman_ford(_linear(), "A")
    assert not neg_cycle
    assert dist["A"] == 0.0
    assert dist["B"] == 1.0
    assert dist["C"] == 3.0


def test_bf_path_reconstruction():
    _, prev, neg_cycle, _ = bellman_ford(_linear(), "A")
    assert not neg_cycle
    assert prev["C"] == "B"
    assert prev["B"] == "A"
    assert prev["A"] is None


def test_bf_negative_edge_no_cycle():
    dist, prev, neg_cycle, _ = bellman_ford(_negative_no_cycle(), "A")
    assert not neg_cycle
    assert dist["C"] == pytest.approx(-1.0)
    assert prev["C"] == "B"


def test_bf_detects_negative_cycle():
    _, _, neg_cycle, neg_nodes = bellman_ford(_negative_cycle(), "A")
    assert neg_cycle
    assert len(neg_nodes) > 0


def test_bf_negative_cycle_nodes_affected():
    _, _, _, neg_nodes = bellman_ford(_negative_cycle(), "A")
    assert {"A", "B", "C"} & neg_nodes


def test_bf_unreachable_node():
    g = _linear()
    g.add_edge(DiEdge("X", "Y", weight=1, cost=1.0))
    dist, _, neg_cycle, _ = bellman_ford(g, "A")
    assert not neg_cycle
    assert dist["X"] == float("inf")


def test_bf_custom_weight_fn():
    dist, _, neg_cycle, _ = bellman_ford(
        _linear(), "A", weight_fn=lambda e: e.cost * 2
    )
    assert not neg_cycle
    assert dist["B"] == pytest.approx(2.0)
    assert dist["C"] == pytest.approx(6.0)


def test_bf_invalid_source():
    with pytest.raises(ValueError):
        bellman_ford(_linear(), "Z")
