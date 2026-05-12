"""
Implementa os requisitos 7 e 8 do projeto.
"""

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from pathlib import Path
from typing import Any
from src.graphs.graph import Graph
from src.graphs.algorithms import dijkstra_caminho
from src.metricas import calc_ego, calc_regioes

def _get_out_dir(root: Path | None = None) -> Path:
    if root:
        return root / "out"
    return Path(__file__).resolve().parent.parent / "out"

def visualizar_arvore_percurso(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    out_dir.mkdir(parents=True, exist_ok=True)

    _, caminho1 = dijkstra_caminho(grafo, "REC", "POA")
    _, caminho2 = dijkstra_caminho(grafo, "MAO", "GRU")

    G = nx.Graph()
    percurso_edges = set()
    
    if caminho1:
        for i in range(len(caminho1) - 1):
            u, v = sorted((caminho1[i], caminho1[i+1]))
            percurso_edges.add((u, v))
            
    if caminho2:
        for i in range(len(caminho2) - 1):
            u, v = sorted((caminho2[i], caminho2[i+1]))
            percurso_edges.add((u, v))

    for u, v in percurso_edges:
        G.add_edge(u, v)

    if not G.nodes():
        print("Aviso: Nenhum percurso encontrado para visualização.")
        return None

    plt.figure(figsize=(10, 8))
    pos = nx.spring_layout(G, seed=42)
    
    nx.draw_networkx_nodes(G, pos, node_size=700, node_color='skyblue')
    nx.draw_networkx_labels(G, pos, font_size=10, font_weight='bold')
    nx.draw_networkx_edges(G, pos, width=2, edge_color='gray', alpha=0.7)
    
    if caminho1:
        path1_edges = [(caminho1[i], caminho1[i+1]) for i in range(len(caminho1)-1)]
        nx.draw_networkx_edges(G, pos, edgelist=path1_edges, width=4, edge_color='tab:red', label='REC -> POA')
        
    if caminho2:
        path2_edges = [(caminho2[i], caminho2[i+1]) for i in range(len(caminho2)-1)]
        nx.draw_networkx_edges(G, pos, edgelist=path2_edges, width=4, edge_color='tab:blue', label='MAO -> GRU')

    plt.title("Subgrafo dos Percursos Obrigatórios\n(Árvore de Caminho)")
    plt.legend()
    plt.axis('off')
    
    png_path = out_dir / "arvore_percurso.png"
    plt.savefig(png_path, bbox_inches='tight', dpi=300)
    plt.close()
    return png_path

def visualizar_distribuicao_graus(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    graus = [d['grau'] for d in ego_data]

    plt.figure(figsize=(8, 6))
    plt.hist(graus, bins=range(min(graus), max(graus) + 2), color='teal', edgecolor='black', alpha=0.7)
    plt.title("Distribuição de Graus dos Aeroportos")
    plt.xlabel("Grau (Número de Conexões)")
    plt.ylabel("Frequência (Quantidade de Aeroportos)")
    plt.grid(axis='y', linestyle='--', alpha=0.6)
    
    save_path = out_dir / "distribuicao_graus.png"
    plt.savefig(save_path, bbox_inches='tight')
    plt.close()
    return save_path

def visualizar_ranking_conectividade(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    sorted_data = sorted(ego_data, key=lambda x: x['grau'], reverse=True)[:10]
    
    iatas = [d['aeroporto'] for d in sorted_data]
    graus = [d['grau'] for d in sorted_data]
    
    plt.figure(figsize=(10, 6))
    colors = plt.get_cmap("viridis")(np.linspace(0, 0.8, len(iatas)))
    bars = plt.bar(iatas, graus, color=colors)
    plt.title("Top 10 Aeroportos Mais Conectados")
    plt.xlabel("Código IATA")
    plt.ylabel("Grau")
    
    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval + 0.1, yval, ha='center', va='bottom')

    save_path = out_dir / "ranking_conectividade.png"
    plt.savefig(save_path, bbox_inches='tight')
    plt.close()
    return save_path

def visualizar_comparacao_regioes(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    regioes_data = calc_regioes(grafo)
    
    regioes = [r['regiao'] for r in regioes_data]
    num_aeroportos = [r['ordem'] for r in regioes_data]
    
    plt.figure(figsize=(10, 6))
    plt.bar(regioes, num_aeroportos, color='coral')
    plt.title("Quantidade de Aeroportos por Região")
    plt.xlabel("Região")
    plt.ylabel("Número de Aeroportos")
    
    save_path = out_dir / "comparacao_regioes.png"
    plt.savefig(save_path, bbox_inches='tight')
    plt.close()
    return save_path

def visualizar_subgrafo_maior_grau(grafo: Graph, root: Path | None = None):
    out_dir = _get_out_dir(root)
    ego_data = calc_ego(grafo)
    if not ego_data:
        return None
    hub = max(ego_data, key=lambda x: x['grau'])['aeroporto']
    
    vizinhos = [v for v, _ in grafo.neighbors(hub)]
    nodes = [hub] + vizinhos
    
    G = nx.Graph()
    for u in nodes:
        for v, edge in grafo.neighbors(u):
            if v in nodes:
                G.add_edge(u, v, weight=edge.peso)

    plt.figure(figsize=(10, 8))
    pos = nx.spring_layout(G, seed=42)
    
    node_colors = ['gold' if n == hub else 'lightblue' for n in G.nodes()]
    nx.draw(G, pos, with_labels=True, node_color=node_colors, node_size=800, font_size=10, font_weight='bold', edge_color='gray')
    
    plt.title(f"Subgrafo da Ego-rede do Hub: {hub}")
    plt.axis('off')
    
    save_path = out_dir / "subgrafo_hub.png"
    plt.savefig(save_path, bbox_inches='tight')
    plt.close()
    return save_path

def gerar_notas_analiticas(root: Path | None = None):
    out_dir = _get_out_dir(root)
    conteudo = """NOTAS ANALÍTICAS - VISUALIZAÇÕES E INSIGHTS

1. Árvore de Percurso (arvore_percurso.png)
- O que está sendo mostrado: O subgrafo formado pelas arestas dos caminhos mínimos entre Recife-Porto Alegre e Manaus-São Paulo (GRU).
- Insight: Revela a conectividade necessária para realizar essas rotas específicas, destacando a espinha dorsal do percurso.
- Por que: A visualização de grafo é ideal para mostrar conexões topológicas e a hierarquia do trajeto.

2. Distribuição de Graus (distribuicao_graus.png)
- O que está sendo mostrado: Histograma da frequência de graus (número de conexões) de todos os aeroportos.
- Insight: Permite identificar se a rede segue uma distribuição de lei de potência (típica de redes scale-free) ou se é mais homogênea.
- Por que: Histogramas são a escolha padrão da estatística para mostrar distribuições de variáveis discretas.

3. Top 10 Aeroportos Mais Conectados (ranking_conectividade.png)
- O que está sendo mostrado: Gráfico de barras ordenado dos aeroportos com o maior número de conexões diretas.
- Insight: Identifica claramente os principais hubs da malha aérea nacional (ex: GRU, BSB).
- Por que: Gráficos de barras ordenados facilitam a comparação direta de grandezas e a identificação de rankings.

4. Quantidade de Aeroportos por Região (comparacao_regioes.png)
- O que está sendo mostrado: Comparação volumétrica de quantos aeroportos do dataset pertencem a cada região do Brasil.
- Insight: Mostra a cobertura geográfica do grafo e quais regiões possuem maior infraestrutura aeroportuária representada.
- Por que: Gráficos de barras são eficientes para comparar categorias discretas.

5. Subgrafo da Ego-rede do Hub (subgrafo_hub.png)
- O que está sendo mostrado: Visualização detalhada das conexões diretas do aeroporto com maior grau e as interconexões entre seus vizinhos.
- Insight: Revela a complexidade local e a resiliência do principal ponto de articulação do grafo.
- Por que: Um diagrama de rede local (ego-network) foca no micro-contexto de um nó crítico.
"""
    save_path = out_dir / "notas_analiticas.txt"
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(conteudo)
    return save_path

def run_all_visualizations(grafo: Graph, root: Path | None = None):
    print("Gerando visualizações...")
    visualizar_arvore_percurso(grafo, root)
    visualizar_distribuicao_graus(grafo, root)
    visualizar_ranking_conectividade(grafo, root)
    visualizar_comparacao_regioes(grafo, root)
    visualizar_subgrafo_maior_grau(grafo, root)
    gerar_notas_analiticas(root)
    print(f"Todas as visualizações foram salvas em: {_get_out_dir(root)}")
