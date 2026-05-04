"""Parte 1 — modelagem: ``io`` (CSV) e ``graph`` (objetos Nó/Aresta/Grafo)."""

from importlib import import_module

__all__ = [
    "io",
    "Edge",
    "Graph",
    "Node",
    "graph_from_csv_files",
    "graph_from_model_files",
]


def __getattr__(name: str):
    if name == "io":
        return import_module(f"{__name__}.io")
    if name in (
        "Edge",
        "Graph",
        "Node",
        "graph_from_csv_files",
        "graph_from_model_files",
    ):
        graph_module = import_module(f"{__name__}.graph")
        return getattr(graph_module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
