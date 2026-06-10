from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from src.graphs.graph import Graph
from src.graphs.algorithms import dijkstra_caminho

                                                                             
     
                                                                             

def load_rotas(root: Path | None = None) -> list[dict[str, str]]:
    from src.graphs.io import data_dir
    caminho = data_dir(root) / "rotas.csv"
    with open(caminho, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def _out_dir(root: Path | None = None) -> Path:
    base = root if root is not None else Path(__file__).resolve().parent.parent
    return base / "out"

def gravar_distancias_csv(
    dados: list[dict[str, Any]],
    root: Path | None = None,
) -> Path:
    caminho = _out_dir(root) / "distancias_rotas.csv"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["origem", "destino", "custo", "caminho"]
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dados)
    return caminho

                                                                             
         
                                                                             

def calc_distancias(
    grafo: Graph,
    rotas: list[dict[str, str]],
) -> list[dict[str, Any]]:
    resultado: list[dict[str, Any]] = []
    for rota in rotas:
        orig = rota["origem"].strip()
        dest = rota["destino"].strip()
        custo, caminho = dijkstra_caminho(grafo, orig, dest)
        resultado.append({
            "origem": orig,
            "destino": dest,
            "custo": round(custo, 4) if custo != float("inf") else "inf",
            "caminho": " -> ".join(caminho) if caminho else "sem caminho",
        })
    return resultado

                                                                             
                  
                                                                             

def run(grafo: Graph, root: Path | None = None) -> dict[str, Any]:
    rotas = load_rotas(root)
    distancias = calc_distancias(grafo, rotas)
    path_csv = gravar_distancias_csv(distancias, root)
    return {
        "distancias": distancias,
        "arquivo": str(path_csv),
    }
