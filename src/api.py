"""
api.py — FastAPI backend para o frontend React.

Expõe endpoints para upload de CSV, execução do pipeline e consulta de dados.
Execute com:  uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
"""

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


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

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
        "grafo_html": (OUT_DIR / "grafo_interativo.html").exists(),
    }


# ---------------------------------------------------------------------------
# Upload CSV
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Graph data
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Algorithm runner
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Aviation stats (ANAC / IBGE supplementary data)
# ---------------------------------------------------------------------------

@app.get("/api/data/aviation-stats")
def get_aviation_stats() -> dict[str, Any]:
    path = DATA_DIR / "aviation_stats.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="aviation_stats.json não encontrado.")
    return json.loads(path.read_text(encoding="utf-8"))


# Mandatory paths (Recife→Porto Alegre  and  Manaus→São Paulo)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Serve generated output files
# ---------------------------------------------------------------------------

OUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/out", StaticFiles(directory=str(OUT_DIR)), name="out")


# ---------------------------------------------------------------------------
# Serve React SPA (production build)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)
