"""
Parte 1 — modelagem do grafo de aeroportos: gerar e validar ``adjacencias_aeroportos.csv``.

Lê ``data/aeroportos_data.csv`` e grava ``data/adjacencias_aeroportos.csv``
(modelo Regional + Hub + Hub-Hub).
"""

from __future__ import annotations

import csv
from collections import defaultdict, deque
from itertools import combinations
from pathlib import Path
from typing import Any

HUBS = frozenset({"GRU", "GIG", "BSB"})


def project_root() -> Path:
    """Raiz do repositório (pasta que contém ``data/``)."""
    return Path(__file__).resolve().parent.parent.parent


def data_dir(repo_root: Path | None = None) -> Path:
    base = project_root() if repo_root is None else repo_root
    return base / "data"
        

def load_airport_rows(
    path: Path | None = None,
    *,
    root: Path | None = None,
) -> list[dict[str, str]]:
    csv_path = path if path is not None else data_dir(root) / "aeroportos_data.csv"
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def load_adjacencia_rows(
    path: Path | None = None,
    *,
    root: Path | None = None,
) -> list[dict[str, str]]:
    csv_path = path if path is not None else data_dir(root) / "adjacencias_aeroportos.csv"
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def build_adjacencias_edges(airport_rows: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, Any]]:
    """Monta o dicionário de arestas (par ordenado) a partir da lista de aeroportos."""
    iata_to_regiao = {row["iata"]: row["regiao"] for row in airport_rows}
    edges: dict[tuple[str, str], dict[str, Any]] = {}

    def add_edge(
        iata_a: str,
        iata_b: str,
        tipo: str,
        justificativa: str,
        peso: float,
    ) -> None:
        origem, destino = sorted((iata_a, iata_b))
        edge_key = (origem, destino)
        if edge_key in edges:
            msg = f"Aresta duplicada: {origem}-{destino}"
            raise ValueError(msg)
        edges[edge_key] = {
            "origem": origem,
            "destino": destino,
            "tipo_conexao": tipo,
            "justificativa": justificativa,
            "peso": peso,
        }

    by_regiao: dict[str, list[str]] = defaultdict(list)
    for row in airport_rows:
        by_regiao[row["regiao"]].append(row["iata"])

    for regiao, iata_list in sorted(by_regiao.items()):
        for iata_a, iata_b in combinations(sorted(iata_list), 2):
            add_edge(
                iata_a,
                iata_b,
                "regional",
                f"mesma região ({regiao})",
                1.0,
            )

    for row in airport_rows:
        iata = row["iata"]
        regiao = row["regiao"]
        if iata in HUBS:
            continue
        for hub in ("GRU", "GIG", "BSB"):
            hub_reg = iata_to_regiao[hub]
            if hub_reg == regiao:
                continue
            add_edge(
                iata,
                hub,
                "hub",
                f"conexão via hub nacional {hub} ({hub_reg}) a partir da região {regiao}",
                2.0,
            )

    add_edge(
        "GRU",
        "BSB",
        "hub-hub",
        "rota estratégica entre hubs nacionais",
        1.5,
    )
    add_edge(
        "GIG",
        "BSB",
        "hub-hub",
        "rota estratégica entre hubs nacionais",
        1.5,
    )

    return edges


def write_adjacencias_aeroportos_csv(
    out_path: Path | None = None,
    *,
    root: Path | None = None,
) -> int:
    """Gera ``adjacencias_aeroportos.csv``; retorna número de arestas."""
    repo_root = project_root() if root is None else root
    airport_rows = load_airport_rows(root=repo_root)
    edges = build_adjacencias_edges(airport_rows)
    output_path = out_path if out_path is not None else data_dir(repo_root) / "adjacencias_aeroportos.csv"
    fieldnames = ["origem", "destino", "tipo_conexao", "justificativa", "peso"]
    sorted_edge_keys = sorted(edges.keys())
    with open(output_path, "w", newline="", encoding="utf-8") as out_file:
        writer = csv.DictWriter(out_file, fieldnames=fieldnames)
        writer.writeheader()
        for edge_key in sorted_edge_keys:
            edge_row = edges[edge_key]
            writer.writerow({column: edge_row[column] for column in fieldnames})
    return len(edges)


def _is_connected(adjacency: dict[str, set[str]], nodes: list[str]) -> bool:
    if not nodes:
        return True
    start = nodes[0]
    seen = {start}
    queue: deque[str] = deque([start])
    while queue:
        current = queue.popleft()
        for neighbor in adjacency[current]:
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
    return len(seen) == len(nodes)


def validate_modelagem(*, root: Path | None = None) -> dict[str, Any]:
    """
    Valida ``aeroportos_data.csv`` + ``adjacencias_aeroportos.csv``.

    Retorna um dicionário com estatísticas; levanta ``AssertionError`` ou
    ``ValueError`` se algum requisito da Parte 1 falhar.
    """
    repo_root = project_root() if root is None else root
    airport_rows = load_airport_rows(root=repo_root)
    nodes = [row["iata"] for row in airport_rows]
    regiao_por_iata = {row["iata"]: row["regiao"] for row in airport_rows}
    num_nodes = len(nodes)

    edge_rows = load_adjacencia_rows(root=repo_root)
    num_edges = len(edge_rows)

    parsed_edges: list[tuple[str, str, str, str, float]] = []
    for row in edge_rows:
        parsed_edges.append(
            (
                row["origem"],
                row["destino"],
                row["tipo_conexao"],
                row["justificativa"],
                float(row["peso"]),
            )
        )

    adjacency: dict[str, set[str]] = defaultdict(set)
    for origem, destino, _tipo_conexao, _justificativa, _peso in parsed_edges:
        adjacency[origem].add(destino)
        adjacency[destino].add(origem)

    ok_connected = _is_connected(adjacency, nodes)

    regional_pairs_by_region: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for origem, destino, tipo_conexao, _justificativa, _peso in parsed_edges:
        if tipo_conexao == "regional" and regiao_por_iata[origem] == regiao_por_iata[destino]:
            regional_pairs_by_region[regiao_por_iata[origem]].append((origem, destino))

    regions = sorted(set(regiao_por_iata.values()))
    intra_region_ok = all(
        len(regional_pairs_by_region[nome_regiao]) > 0 for nome_regiao in regions
    )
    num_inter_region_edges = sum(
        1
        for origem, destino, *_rest in parsed_edges
        if regiao_por_iata[origem] != regiao_por_iata[destino]
    )
    max_possible_edges = num_nodes * (num_nodes - 1) / 2
    density = num_edges / max_possible_edges if max_possible_edges else 0.0

    for _origem, _destino, tipo_conexao, justificativa, _peso in parsed_edges:
        if not str(tipo_conexao).strip():
            raise ValueError("tipo_conexao vazio")
        if not str(justificativa).strip():
            raise ValueError("justificativa vazio")

    assert ok_connected, "Grafo deve ser conectado"
    assert intra_region_ok, "Deve haver conexão regional em cada região"
    assert num_inter_region_edges > 0, "Deve haver conexão entre regiões diferentes"
    assert num_edges == 81, f"Esperado 81 arestas pelo modelo, obtido {num_edges}"
    assert 0.2 < density < 0.95, "Evitar trivialidade extrema (checagem leve)"

    return {
        "n": num_nodes,
        "m": num_edges,
        "conectado": ok_connected,
        "intra_regiao_ok": intra_region_ok,
        "arestas_inter_regionais": num_inter_region_edges,
        "densidade": density,
        "regioes": regions,
    }


def _cli_main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Parte 1 — gerar ou validar adjacencias_aeroportos.csv",
    )
    subparsers = parser.add_subparsers(dest="cmd", required=True)

    parser_gerar = subparsers.add_parser("gerar", help="Gera data/adjacencias_aeroportos.csv")
    parser_gerar.add_argument(
        "--root",
        type=Path,
        default=None,
        help="Raiz do repositório (padrão: pasta que contém src/)",
    )

    parser_validar = subparsers.add_parser("validar", help="Valida aeroportos + adjacências")
    parser_validar.add_argument("--root", type=Path, default=None)

    args = parser.parse_args(argv)
    repo_root = args.root.resolve() if getattr(args, "root", None) else None

    if args.cmd == "gerar":
        num_arestas = write_adjacencias_aeroportos_csv(root=repo_root)
        output_path = data_dir(repo_root) / "adjacencias_aeroportos.csv"
        print(f"Gerado: {output_path} ({num_arestas} arestas)")
        return 0

    if args.cmd == "validar":
        stats = validate_modelagem(root=repo_root)
        print(f"Conectado: {stats['conectado']} (n={stats['n']}, m={stats['m']})")
        print(
            "Arestas regionais em todas as regiões: "
            f"{stats['intra_regiao_ok']} ({stats['regioes']})"
        )
        print(f"Arestas inter-regionais: {stats['arestas_inter_regionais']}")
        print(f"Densidade (m / C(n,2)): {stats['densidade']:.4f}")
        print("Validação OK.")
        return 0

    parser.print_help()
    return 2


if __name__ == "__main__":
    import sys

    sys.exit(_cli_main())
