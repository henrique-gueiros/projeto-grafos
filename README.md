# Projeto Grafos — Rede de Aeroportos do Brasil

Disciplina de Grafos — Parte 1: modelagem, métricas, algoritmos e visualizações.

## Requisitos

- Python 3.11 ou superior
- Dependências listadas em [`requirements.txt`](requirements.txt)

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd projeto-grafos

# Ambiente virtual (Python 3.12 do Homebrew)
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate   # ou: source activate.sh

pip install -r requirements.txt
```

## Estrutura do projeto

```
projeto-grafos/
├── README.md
├── requirements.txt
├── data/
│   ├── aeroportos_data.csv          # nós: IATA, cidade, região
│   ├── adjacencias_aeroportos.csv   # arestas (gerado pelo CLI)
│   └── rotas.csv                    # pares para cálculo de distâncias
├── out/                             # saídas geradas (.json, .csv, .png, .html)
├── src/
│   ├── cli.py                       # interface de linha de comando
│   ├── solve.py                     # orquestração das partes 3 e 6
│   ├── metricas.py                  # métricas: global, regiões, ego-redes
│   ├── distancias.py                # cálculo de menores caminhos
│   ├── analise_visual.py            # visualizações (Req 7, 8, 9 e 10)
│   └── graphs/
│       ├── graph.py                 # estruturas: Node, Edge, Graph
│       ├── algorithms.py            # BFS, DFS, Dijkstra, Bellman-Ford (impl. própria)
│       └── io.py                    # leitura/escrita de CSV, modelo de arestas
└── tests/
    ├── test_bfs.py
    ├── test_dfs.py
    ├── test_dijkstra.py
    └── test_bellman_ford.py
```

## Como rodar (passo a passo)

### 1. Gerar o CSV de adjacências

```bash
python -m src.cli gerar
```

Lê `data/aeroportos_data.csv` e grava `data/adjacencias_aeroportos.csv` com 81 arestas.

### 2. Validar o modelo

```bash
python -m src.cli validar
```

Confirma que o grafo é conectado, tem conexões intra e inter-regionais e densidade razoável.

### 3. Calcular métricas (Partes 3 e 4)

```bash
python -m src.cli metricas
```

Gera:
- `out/global.json` — ordem, tamanho, densidade do grafo completo
- `out/regioes.json` — métricas dos 5 subgrafos regionais
- `out/ego_aeroportos.csv` — grau, ordem_ego, tamanho_ego, densidade_ego por aeroporto
- `out/graus.csv` — ranking de graus

### 4. Calcular distâncias (Parte 6 — Dijkstra)

```bash
python -m src.cli distancias
```

Lê `data/rotas.csv` e grava `out/distancias_rotas.csv` com custo e caminho mínimo para cada par, incluindo os obrigatórios Recife → Porto Alegre e Manaus → São Paulo.

### 5. Gerar todas as visualizações (Req 7, 8, 9 e 10)

```bash
python -m src.cli viz
```

Executa todos os requisitos de visualização de uma só vez. Veja a lista completa de saídas na seção [Arquivos de saída](#arquivos-de-saída).

### 6. Comandos individuais por requisito

```bash
# Req 9 — apenas o grafo interativo HTML
python -m src.cli interativo

# Req 10 — apenas as visualizações exploratórias e explanatórias
python -m src.cli analise
```

### Referência completa de comandos

| Comando | Descrição |
|---|---|
| `python -m src.cli gerar` | Gera `data/adjacencias_aeroportos.csv` |
| `python -m src.cli validar` | Valida os dois CSVs |
| `python -m src.cli metricas` | Métricas globais, regionais e ego-redes (Partes 3–4) |
| `python -m src.cli distancias` | Menor caminho Dijkstra para pares em `rotas.csv` (Parte 6) |
| `python -m src.cli viz` | Todas as visualizações (Req 7, 8, 9 e 10) |
| `python -m src.cli interativo` | Só o HTML interativo (Req 9) |
| `python -m src.cli analise` | Só as visualizações exploratórias/explanatórias (Req 10) |

Todos os comandos aceitam `--root PATH` para especificar a raiz do projeto manualmente.

---

## Arquivos de saída

Após rodar `python -m src.cli viz`, a pasta `out/` conterá:

| Arquivo | Requisito | Descrição |
|---|---|---|
| `global.json` | Parte 3 | Ordem, tamanho e densidade do grafo completo |
| `regioes.json` | Parte 3 | Métricas dos 5 subgrafos regionais |
| `ego_aeroportos.csv` | Parte 3 | Grau e ego-rede por aeroporto |
| `graus.csv` | Parte 4 | Ranking de graus decrescente |
| `distancias_rotas.csv` | Parte 6 | Custo e caminho mínimo para cada par |
| `arvore_percurso_rec_poa.png` | Req 7 | Subgrafo do caminho REC→POA |
| `arvore_percurso_mao_gru.png` | Req 7 | Subgrafo do caminho MAO→GRU |
| `distribuicao_graus.png` | Req 8 | Histograma de distribuição de graus |
| `ranking_conectividade.png` | Req 8 | Top 10 aeroportos mais conectados |
| `comparacao_regioes.png` | Req 8 | Aeroportos por região |
| `subgrafo_hub.png` | Req 8 | Ego-rede do aeroporto mais conectado |
| `notas_analiticas.txt` | Req 8 | Notas interpretativas de cada visualização |
| `grafo_interativo.html` | Req 9 | Grafo interativo com tooltip, busca e caminhos destacados |
| `explr_dispersao_grau_densidade.png` | Req 10 | Exploratória: scatter grau × densidade-ego |
| `explr_matriz_regioes.png` | Req 10 | Exploratória: heatmap de conexões entre regiões |
| `expl_dominancia_hubs.png` | Req 10 | Explanatória: dominância dos 3 hubs nacionais |
| `expl_densidade_regioes.png` | Req 10 | Explanatória: densidade intra-regional vs. global |
| `analise_avd.txt` | Req 10 | Análise textual completa (base para o PDF) |

---

## Modelagem do grafo (Parte 1)

### Nós

Cada nó é um aeroporto; o rótulo é o código IATA. Fonte: [`data/aeroportos_data.csv`](data/aeroportos_data.csv).

20 aeroportos distribuídos em 5 regiões:

| Região | Aeroportos |
|---|---|
| Norte | MAO, BEL, PVH, RBR |
| Nordeste | REC, SSA, FOR, NAT, JPA, THE |
| Centro-Oeste | BSB, GYN |
| Sudeste | GRU, CGH, GIG, CNF, VIX |
| Sul | CWB, FLN, POA |

### Arestas — modelo Regional + Hub + Hub-Hub

O arquivo [`data/adjacencias_aeroportos.csv`](data/adjacencias_aeroportos.csv) é gerado automaticamente com 3 regras:

| Tipo | Regra | Exemplo |
|---|---|---|
| `regional` | Clique entre todos os aeroportos da mesma região | FOR–REC |
| `hub` | Aeroporto não-hub liga-se aos hubs nacionais fora da sua região | MAO–GRU |
| `hub-hub` | Eixos entre hubs ainda não cobertos pelo regional | GRU–BSB |

Hubs nacionais definidos: **GRU**, **GIG**, **BSB**.

Formato do CSV:

```
origem,destino,tipo_conexao,justificativa,peso
REC,SSA,regional,"mesma região Nordeste",1.5
MAO,GRU,hub,"conexão via hub nacional GRU (Sudeste) a partir da região Norte",2.0
```

### Pesos das arestas (Parte 5 — modelo híbrido)

```
peso = 1.0 + penalidade_regiao + penalidade_hub
```

| Situação | Peso |
|---|---|
| Intra-regional com hub (ex.: BSB–GYN) | **1.0** |
| Intra-regional sem hub (ex.: FOR–JPA) | **1.5** |
| Inter-regional com hub (ex.: GRU–REC) | **2.0** |

Pesos não-negativos — Bellman-Ford reservado para a Parte 2.

---

## Algoritmos implementados

Todos em [`src/graphs/algorithms.py`](src/graphs/algorithms.py), **sem uso de bibliotecas externas** para as implementações:

- **Dijkstra** — menor caminho com pesos ≥ 0, usando `heapq` da stdlib
- **BFS** — busca em largura iterativa
- **DFS** — busca em profundidade iterativa
- **Bellman-Ford** — menor caminho com suporte a pesos negativos (Parte 2)

---

## Bibliotecas utilizadas

| Biblioteca | Uso | Status |
|---|---|---|
| `matplotlib` | Visualizações estáticas (Req 7, 8, 10) | Permitida pelo enunciado |
| `numpy` | Geração de paletas de cor | Permitida pelo enunciado |
| `pyvis` | Grafo interativo HTML (Req 9) | Permitida pelo enunciado |
| `heapq` | Fila de prioridade no Dijkstra | Stdlib Python |

`networkx`, `igraph` e `graph-tool` **não são utilizados** — proibidos pelo enunciado para implementação de algoritmos.

---

## Testes

```bash
python -m pytest tests/
```

| Arquivo de teste | Cobre |
|---|---|
| `tests/test_dijkstra.py` | Dijkstra: caminho mínimo, grafo desconectado, nó inválido |
| `tests/test_bfs.py` | BFS: ordem de visita, grafo desconectado |
| `tests/test_dfs.py` | DFS: ordem de visita, grafo desconectado |
| `tests/test_bellman_ford.py` | Bellman-Ford: pesos negativos, ciclo negativo |
