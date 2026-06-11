from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"

app = FastAPI(title="Projeto Grafos — Rede de Aeroportos", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

                                                                             
        
                                                                             

@app.get("/api/status")
def api_status() -> dict[str, Any]:
    return {
        "aeroportos": (DATA_DIR / "aeroportos_data.csv").exists(),
        "adjacencias": (DATA_DIR / "adjacencias_aeroportos.csv").exists(),
        "rotas": (DATA_DIR / "rotas.csv").exists(),
        "global_json": (OUT_DIR / "global.json").exists(),
        "regioes_json": (OUT_DIR / "regioes.json").exists(),
        "graus_csv": (OUT_DIR / "graus.csv").exists(),
        "distancias_csv": (OUT_DIR / "distancias_rotas.csv").exists(),
    }

                                                                             
            
                                                                             

@app.post("/api/upload/{tipo}")
async def upload_csv(tipo: str, file: UploadFile = File(...)) -> dict[str, str]:
    mapping = {
        "aeroportos": "aeroportos_data.csv",
        "adjacencias": "adjacencias_aeroportos.csv",
        "rotas": "rotas.csv",
    }
    if tipo not in mapping:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo inválido: '{tipo}'. Use: {list(mapping.keys())}",
        )
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / mapping[tipo]
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"message": f"'{mapping[tipo]}' salvo com sucesso.", "path": str(dest)}

                                                                             
          
                                                                             

@app.post("/api/run/gerar")
def run_gerar() -> dict[str, Any]:
    from src.graphs.io import write_adjacencias_aeroportos_csv
    try:
        n = write_adjacencias_aeroportos_csv(root=ROOT)
        return {"success": True, "message": f"Adjacências geradas: {n} arestas."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/run/metricas")
def run_metricas() -> dict[str, Any]:
    from src.solve import solve_parte3
    try:
        resultado = solve_parte3(root=ROOT, verbose=False)
        return {"success": True, "data": resultado}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/run/distancias")
def run_distancias() -> dict[str, Any]:
    from src.solve import solve_parte6
    try:
        resultado = solve_parte6(root=ROOT, verbose=False)
        return {"success": True, "data": resultado}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/api/run/viz")
def run_viz() -> dict[str, Any]:
    from src.graphs.graph import graph_from_csv_files
    from src.analise_visual import run_all_visualizations
    try:
        grafo = graph_from_csv_files(root=ROOT)
        run_all_visualizations(grafo, root=ROOT)
        return {"success": True, "message": "Visualizações geradas em out/"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

                                                                             
            
                                                                             

@app.get("/api/data/graph")
def get_graph_data() -> dict[str, Any]:
    from src.graphs.graph import graph_from_csv_files
    try:
        grafo = graph_from_csv_files(root=ROOT)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    from src.metricas import calc_ego
    ego_map = {e["aeroporto"]: e for e in calc_ego(grafo)}

    nodes = [
        {
            "id": iata,
            "label": iata,
            "cidade": node.cidade,
            "regiao": node.regiao,
            "grau": ego_map.get(iata, {}).get("grau", 0),
            "densidade_ego": ego_map.get(iata, {}).get("densidade_ego", 0.0),
        }
        for iata, node in grafo.nodes.items()
    ]
    edges = [
        {
            "id": f"{e.origem}-{e.destino}",
            "from": e.origem,
            "to": e.destino,
            "weight": e.peso,
            "tipo": e.tipo_conexao,
            "justificativa": e.justificativa,
        }
        for e in grafo.edges()
    ]
    return {"nodes": nodes, "edges": edges}

@app.get("/api/data/metrics")
def get_metrics() -> dict[str, Any]:
    path = OUT_DIR / "global.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Execute 'Calcular Métricas' primeiro.")
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/api/data/regions")
def get_regions() -> list[dict[str, Any]]:
    path = OUT_DIR / "regioes.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Execute 'Calcular Métricas' primeiro.")
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/api/data/grades")
def get_grades() -> list[dict[str, Any]]:
    path = OUT_DIR / "graus.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Execute 'Calcular Métricas' primeiro.")
    rows = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({"aeroporto": row["aeroporto"], "grau": int(row["grau"])})
    return rows

@app.get("/api/data/ego")
def get_ego() -> list[dict[str, Any]]:
    path = OUT_DIR / "ego_aeroportos.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Execute 'Calcular Métricas' primeiro.")
    rows = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({
                "aeroporto": row["aeroporto"],
                "grau": int(row["grau"]),
                "ordem_ego": int(row["ordem_ego"]),
                "tamanho_ego": int(row["tamanho_ego"]),
                "densidade_ego": float(row["densidade_ego"]),
            })
    return rows

@app.get("/api/data/routes")
def get_routes() -> list[dict[str, Any]]:
    path = OUT_DIR / "distancias_rotas.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Execute 'Calcular Distâncias' primeiro.")
    rows = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(dict(row))
    return rows

                                                                             
                  
                                                                             

@app.post("/api/algorithm")
def run_algorithm(body: dict[str, Any]) -> dict[str, Any]:
    from src.graphs.graph import graph_from_csv_files
    from src.graphs import algorithms

    alg = body.get("algorithm", "").upper()
    origem = body.get("source", "").strip()
    destino = body.get("target", "")
    if destino:
        destino = destino.strip()

    try:
        grafo = graph_from_csv_files(root=ROOT)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar grafo: {exc}")

    if origem not in grafo.nodes:
        raise HTTPException(
            status_code=400, detail=f"Aeroporto de origem não encontrado: '{origem}'"
        )

    if alg == "BFS":
        result = algorithms.bfs(grafo, origem)
        return {"algorithm": "BFS", "source": origem, **result}

    elif alg == "DFS":
        result = algorithms.dfs(grafo, origem)
        return {"algorithm": "DFS", "source": origem, **result}

    elif alg == "DIJKSTRA":
        if not destino:
            raise HTTPException(status_code=400, detail="Dijkstra requer campo 'target'.")
        if destino not in grafo.nodes:
            raise HTTPException(
                status_code=400, detail=f"Aeroporto de destino não encontrado: '{destino}'"
            )
        custo, caminho = algorithms.dijkstra_caminho(grafo, origem, destino)
        return {
            "algorithm": "DIJKSTRA",
            "source": origem,
            "target": destino,
            "custo": custo if custo != float("inf") else None,
            "caminho": caminho,
        }

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Algoritmo inválido: '{alg}'. Use: BFS / DFS / DIJKSTRA",
        )

                                                                             
                                                 
                                                                             

@app.get("/api/data/aviation-stats")
def get_aviation_stats() -> dict[str, Any]:
    path = DATA_DIR / "aviation_stats.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="aviation_stats.json não encontrado.")
    return json.loads(path.read_text(encoding="utf-8"))

                                                              
                                                                             

@app.get("/api/data/caminhos-obrigatorios")
def get_caminhos_obrigatorios() -> dict[str, Any]:
    from src.graphs.graph import graph_from_csv_files
    from src.graphs.algorithms import dijkstra_caminho

    try:
        grafo = graph_from_csv_files(root=ROOT)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    def path_edges(path: list[str] | None) -> list[list[str]]:
        if not path:
            return []
        return [[path[i], path[i + 1]] for i in range(len(path) - 1)]

    custo1, path1 = dijkstra_caminho(grafo, "REC", "POA")
    custo2, path2 = dijkstra_caminho(grafo, "MAO", "GRU")

    return {
        "path1": {
            "label": "Recife → Porto Alegre",
            "nodes": path1 or [],
            "edges": path_edges(path1),
            "color": "#00e5ff",
            "custo": custo1 if custo1 != float("inf") else None,
        },
        "path2": {
            "label": "Manaus → São Paulo",
            "nodes": path2 or [],
            "edges": path_edges(path2),
            "color": "#ff6d00",
            "custo": custo2 if custo2 != float("inf") else None,
        },
    }

                                                                             
                                                     
                                                                             

NBA_CSV = DATA_DIR / "dataset_parte2" / "nba_graph_final.csv"

                                                            
_nba_graph_cache: dict[str, Any] = {}

def _load_nba_graph():
    from src.graphs.digraph import digraph_from_csv
    if not NBA_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset NBA não encontrado: {NBA_CSV}",
        )
    mtime = NBA_CSV.stat().st_mtime
    if _nba_graph_cache.get("mtime") != mtime:
        _nba_graph_cache["graph"] = digraph_from_csv(NBA_CSV)
        _nba_graph_cache["mtime"] = mtime
        _nba_graph_cache.pop("sub", None)                     
    return _nba_graph_cache["graph"]

def _load_nba_sample_subgraph():
    from src.parte2 import build_nba_sample
    g = _load_nba_graph()
    if "sub" not in _nba_graph_cache:
        sample = build_nba_sample(g)
        ids = {n["id"] for n in sample["nodes"]}
        _nba_graph_cache["sub"] = g.induced_subgraph(ids)
    return _nba_graph_cache["sub"]

@app.get("/api/parte2/graph")
def get_nba_graph() -> dict[str, Any]:
    from src.parte2 import build_nba_sample
    try:
        g = _load_nba_graph()
        return build_nba_sample(g)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/parte2/report")
def get_nba_report() -> dict[str, Any]:
    path = OUT_DIR / "parte2_report.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="parte2_report.json não encontrado. Execute 'python -m src.cli parte2'.",
        )
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/api/parte2/stats")
def get_nba_stats() -> dict[str, Any]:
    try:
        g = _load_nba_graph()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    out_deg = {n: g.out_degree(n) for n in g.nodes}
    in_deg = {n: g.in_degree(n) for n in g.nodes}

    top_passadores = sorted(
        ({"nome": n, "grau": d} for n, d in out_deg.items()),
        key=lambda x: -x["grau"],
    )[:15]
    top_recebedores = sorted(
        ({"nome": n, "grau": d} for n, d in in_deg.items()),
        key=lambda x: -x["grau"],
    )[:15]

    def _dist(degrees: dict[str, int]) -> list[dict[str, int]]:
        freq: dict[int, int] = {}
        for d in degrees.values():
            if d > 0:
                freq[d] = freq.get(d, 0) + 1
        return [{"grau": k, "freq": v} for k, v in sorted(freq.items())]

    weights = sorted(int(e.weight) for e in g.edges())
    n_w = len(weights)

    def _pct(p: float) -> int:
        return weights[min(n_w - 1, int(n_w * p))] if n_w else 0

                                                                 
    faixas = [(2, 5), (6, 10), (11, 25), (26, 50), (51, 100),
              (101, 250), (251, 500), (501, 4000)]
    weight_hist = []
    for lo, hi in faixas:
        c = sum(1 for w in weights if lo <= w <= hi)
        label = f"{lo}–{hi}" if hi < 4000 else f"{lo}+"
        weight_hist.append({"faixa": label, "freq": c})

    return {
        "num_nodes": g.num_nodes(),
        "num_edges": g.num_edges(),
        "top_passadores": top_passadores,
        "top_recebedores": top_recebedores,
        "out_degree_dist": _dist(out_deg),
        "in_degree_dist": _dist(in_deg),
        "weight_hist": weight_hist,
        "weight_pct": {"p50": _pct(0.50), "p90": _pct(0.90), "p99": _pct(0.99)},
    }

@app.post("/api/parte2/algorithm")
def run_nba_algorithm(body: dict[str, Any]) -> dict[str, Any]:
    from src.graphs import digraph_algorithms as da

    alg = body.get("algorithm", "").upper()
    origem = (body.get("source") or "").strip()
    destino = (body.get("target") or "").strip()

    try:
        g = _load_nba_sample_subgraph()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if origem not in g.nodes:
        raise HTTPException(
            status_code=400,
            detail=f"Jogador '{origem}' não está na subrede exibida. Escolha um dos jogadores visíveis.",
        )

    def _tree_edges(order: list[str], parent: dict[str, str | None]) -> list[list[str]]:
        return [[parent[n], n] for n in order if parent.get(n) is not None]

    if alg == "BFS":
        order, layers, parent = da.bfs_directed(g, origem)
        return {
            "algorithm": "BFS",
            "source": origem,
            "nodes_visited": len(order),
            "num_layers": len(layers),
            "layers": layers,
            "tree_edges": _tree_edges(order, parent),
        }

    if alg == "DFS":
        order, _, _, parent, edge_types, has_cycle = da.dfs_directed(g, origem)
        counts = {"tree": 0, "back": 0, "forward": 0, "cross": 0}
        for etype in edge_types.values():
            counts[etype] += 1
        back_edges = [list(k) for k, v in edge_types.items() if v == "back"]
        return {
            "algorithm": "DFS",
            "source": origem,
            "nodes_visited": len(order),
            "has_cycle": has_cycle,
            "edge_types": counts,
            "tree_edges": _tree_edges(order, parent),
            "back_edges": back_edges,
        }

    if alg == "DIJKSTRA":
        if not destino:
            raise HTTPException(status_code=400, detail="Dijkstra requer campo 'target'.")
        if destino not in g.nodes:
            raise HTTPException(status_code=400, detail=f"Jogador de destino não encontrado na subrede: '{destino}'")
        dist, prev = da.dijkstra_directed(g, origem, target=destino)
        custo = dist.get(destino, float("inf"))
        caminho = da.reconstruir_caminho_di(prev, origem, destino) if custo < float("inf") else None
        return {
            "algorithm": "DIJKSTRA",
            "source": origem,
            "target": destino,
            "custo": round(custo, 6) if custo < float("inf") else None,
            "caminho": caminho,
        }

    if alg in ("BELLMAN-FORD", "BELLMAN_FORD", "BELLMANFORD", "BF"):
        if not destino:
            raise HTTPException(status_code=400, detail="Bellman-Ford requer campo 'target'.")
        if destino not in g.nodes:
            raise HTTPException(status_code=400, detail=f"Jogador de destino não encontrado na subrede: '{destino}'")
                                                                                      
        dist, prev, neg_cycle, _ = da.bellman_ford(g, origem)
        custo = dist.get(destino, float("inf"))
        caminho = da.reconstruir_caminho_di(prev, origem, destino) if custo < float("inf") else None
        return {
            "algorithm": "BELLMAN-FORD",
            "source": origem,
            "target": destino,
            "custo": round(custo, 6) if custo < float("inf") else None,
            "caminho": caminho,
            "has_negative_cycle": neg_cycle,
        }

    raise HTTPException(
        status_code=400,
        detail=f"Algoritmo inválido: '{alg}'. Use: BFS / DFS / DIJKSTRA / BELLMAN-FORD",
    )

                                                                             
                              
                                                                             

OUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/out", StaticFiles(directory=str(OUT_DIR)), name="out")

                                                                             
                                    
                                                                             

_frontend_dist = ROOT / "frontend" / "dist"

if _frontend_dist.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(_frontend_dist / "assets")),
        name="assets",
    )

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str = "") -> FileResponse:
        return FileResponse(str(_frontend_dist / "index.html"))

                                                                             
                 
                                                                             

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)
