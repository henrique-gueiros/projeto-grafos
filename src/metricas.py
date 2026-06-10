from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from src.graphs.graph import Graph

                                                                             
                
                                                                             

def calc_densidade(ordem: int, tamanho: int) -> float:
    if ordem < 2:
        return 0.0
    return (2 * tamanho) / (ordem * (ordem - 1))

def calc_global(grafo: Graph) -> dict[str, Any]:
    ordem = grafo.num_nodes()
    tamanho = grafo.num_edges()
    return {
        "ordem": ordem,
        "tamanho": tamanho,
        "densidade": round(calc_densidade(ordem, tamanho), 6),
    }

def calc_regioes(grafo: Graph) -> list[dict[str, Any]]:
                             
    nos_por_regiao: dict[str, set[str]] = {}
    for iata, node in grafo.nodes.items():
        nos_por_regiao.setdefault(node.regiao, set()).add(iata)

    resultado: list[dict[str, Any]] = []
    for regiao in sorted(nos_por_regiao):
        nos = nos_por_regiao[regiao]
        ordem = len(nos)
        tamanho = sum(
            1
            for edge in grafo.edges()
            if edge.origem in nos and edge.destino in nos
        )
        resultado.append(
            {
                "regiao": regiao,
                "aeroportos": sorted(nos),
                "ordem": ordem,
                "tamanho": tamanho,
                "densidade": round(calc_densidade(ordem, tamanho), 6),
            }
        )
    return resultado

def calc_ego(grafo: Graph) -> list[dict[str, Any]]:
    resultado: list[dict[str, Any]] = []
    for iata in sorted(grafo.nodes):
        vizinhos = [nb for nb, _ in grafo.neighbors(iata)]
        grau = len(vizinhos)

        nos_ego: set[str] = {iata} | set(vizinhos)
        ordem_ego = len(nos_ego)
        tamanho_ego = sum(
            1
            for edge in grafo.edges()
            if edge.origem in nos_ego and edge.destino in nos_ego
        )
        resultado.append(
            {
                "aeroporto": iata,
                "grau": grau,
                "ordem_ego": ordem_ego,
                "tamanho_ego": tamanho_ego,
                "densidade_ego": round(calc_densidade(ordem_ego, tamanho_ego), 6),
            }
        )
    return resultado

def calc_graus_rankings(ego_data: list[dict[str, Any]]) -> dict[str, Any]:
                                                                      
    graus_sorted = sorted(
        [{"aeroporto": r["aeroporto"], "grau": r["grau"]} for r in ego_data],
        key=lambda x: (-x["grau"], x["aeroporto"]),
    )

                                    
    grau_max = graus_sorted[0]["grau"] if graus_sorted else 0
    mais_conectado = [r["aeroporto"] for r in graus_sorted if r["grau"] == grau_max]

                                                            
    dens_max = max((r["densidade_ego"] for r in ego_data), default=0.0)
    maior_densidade_local = [
        r["aeroporto"] for r in ego_data if r["densidade_ego"] == dens_max
    ]

    return {
        "graus": graus_sorted,
        "mais_conectado": mais_conectado,
        "grau_maximo": grau_max,
        "maior_densidade_local": maior_densidade_local,
        "densidade_local_maxima": dens_max,
    }

                                                                             
              
                                                                             

def _out_dir(root: Path | None = None) -> Path:
    base = root if root is not None else Path(__file__).resolve().parent.parent
    return base / "out"

def gravar_global_json(dados: dict[str, Any], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "global.json"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho

def gravar_regioes_json(dados: list[dict[str, Any]], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "regioes.json"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho

def gravar_ego_csv(dados: list[dict[str, Any]], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "ego_aeroportos.csv"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["aeroporto", "grau", "ordem_ego", "tamanho_ego", "densidade_ego"]
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dados)
    return caminho

def gravar_graus_csv(dados: list[dict[str, Any]], root: Path | None = None) -> Path:
    caminho = _out_dir(root) / "graus.csv"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["aeroporto", "grau"]
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dados)
    return caminho

                                                                             
                                                  
                                                                             

def run(grafo: Graph, root: Path | None = None) -> dict[str, Any]:
    global_data = calc_global(grafo)
    regioes_data = calc_regioes(grafo)
    ego_data = calc_ego(grafo)
    rankings_data = calc_graus_rankings(ego_data)

    path_global = gravar_global_json(global_data, root)
    path_regioes = gravar_regioes_json(regioes_data, root)
    path_ego = gravar_ego_csv(ego_data, root)
    path_graus = gravar_graus_csv(rankings_data["graus"], root)

    return {
        "global": global_data,
        "regioes": regioes_data,
        "ego": ego_data,
        "rankings": rankings_data,
        "arquivos": {
            "global_json": str(path_global),
            "regioes_json": str(path_regioes),
            "ego_csv": str(path_ego),
            "graus_csv": str(path_graus),
        },
    }
