# Projeto Grafos

Disciplina de Grafos — Parte 1: Rede de Aeroportos do Brasil (grafo não-dirigido) e Parte 2: Rede de Assistências da NBA (dígrafo).

# Slides

https://canva.link/yada5mizhjj0xxs

## Requisitos

- Python 3.11 ou superior
- Node.js 18 ou superior (apenas para o frontend React)
- Dependências Python listadas em [`requirements.txt`](requirements.txt)
- `reportlab` (opcional, apenas para geração dos PDFs de análise)

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd projeto-grafos

# Crie e ative o ambiente virtual
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Linux/macOS

pip install -r requirements.txt

# Opcional — geração de PDFs
pip install reportlab
```

---

## Estrutura do projeto

```
projeto-grafos/
├── README.md
├── RELATORIO.md                         # análise descritiva das métricas e visualizações
├── requirements.txt
├── data/
│   ├── aeroportos_data.csv              # nós Parte 1: IATA, cidade, região
│   ├── adjacencias_aeroportos.csv       # arestas Parte 1 (gerado pelo CLI)
│   ├── rotas.csv                        # pares para cálculo de distâncias (Parte 1)
│   ├── aviation_stats.json              # estatísticas do setor aéreo (painel frontend)
│   └── dataset_parte2/
│       └── nba_graph_final.csv          # dígrafo NBA: source, target, weight, cost
├── out/                                 # saídas geradas (.json, .csv, .png, .html)
├── src/
│   ├── cli.py                           # interface de linha de comando
│   ├── solve.py                         # orquestração das partes 3 e 6
│   ├── parte2.py                        # orquestração da Parte 2 (NBA)
│   ├── api.py                           # API FastAPI (serve o frontend React)
│   ├── viz.py                           # ponto de entrada para visualizações Parte 1
│   ├── metricas.py                      # métricas: global, regiões, ego-redes
│   ├── distancias.py                    # cálculo de menores caminhos (Parte 1)
│   ├── analise_visual.py                # visualizações Parte 1 (Req 7, 8 e 10)
│   ├── gerar_pdf_avd.py                 # gera PDF de análise AVD da Parte 1
│   ├── gerar_pdf_nba.py                 # gera PDF de análise AVD da Parte 2
│   └── graphs/
│       ├── graph.py                     # estruturas não-dirigidas: Node, Edge, Graph
│       ├── algorithms.py                # BFS, DFS, Dijkstra (grafo não-dirigido)
│       ├── io.py                        # leitura/escrita de CSV, modelo de arestas
│       ├── digraph.py                   # estruturas dirigidas: DiNode, DiEdge, DiGraph
│       └── digraph_algorithms.py        # BFS, DFS, Dijkstra, Bellman-Ford (dígrafo)
├── frontend/                            # aplicação React (Vite + Tailwind)
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx              # página inicial com cards de navegação
│       │   ├── Home.jsx                 # Parte 1: grafo interativo de aeroportos
│       │   ├── Dashboard.jsx            # Parte 1: painel analítico com filtros
│       │   ├── NbaGraph.jsx             # Parte 2: grafo interativo NBA
│       │   └── NbaDashboard.jsx         # Parte 2: painel analítico NBA
│       ├── App.jsx                      # roteamento (/, /parte1, /parte1/dashboard, /parte2, /parte2/dashboard)
│       └── api.js                       # cliente HTTP para a API FastAPI
└── tests/
    ├── test_bfs.py
    ├── test_dfs.py
    ├── test_dijkstra.py
    └── test_bellman_ford.py
```

---

## Parte 1 — Rede de Aeroportos do Brasil

### Modelagem do grafo

**Nós:** 20 aeroportos identificados pelo código IATA, distribuídos em 5 regiões.

| Região | Aeroportos |
|---|---|
| Norte | MAO, BEL, PVH, RBR |
| Nordeste | REC, SSA, FOR, NAT, JPA, THE |
| Centro-Oeste | BSB, GYN |
| Sudeste | GRU, CGH, GIG, CNF, VIX |
| Sul | CWB, FLN, POA |

**Arestas — modelo Regional + Hub + Hub-Hub** (`data/adjacencias_aeroportos.csv`):

| Tipo | Regra | Exemplo |
|---|---|---|
| `regional` | Clique entre todos os aeroportos da mesma região | FOR–REC |
| `hub` | Aeroporto não-hub liga-se aos hubs nacionais fora da sua região | MAO–GRU |
| `hub-hub` | Eixos entre hubs ainda não cobertos pelo regional | GRU–BSB |

Hubs nacionais: **GRU**, **GIG**, **BSB**. Total gerado: **81 arestas**.

**Pesos das arestas (modelo híbrido):**

```
peso = 1.0 + penalidade_regiao + penalidade_hub
```

| Situação | Peso |
|---|---|
| Intra-regional com hub (ex.: BSB–GYN) | **1.0** |
| Intra-regional sem hub (ex.: FOR–JPA) | **1.5** |
| Inter-regional com hub (ex.: GRU–REC) | **2.0** |

### Como rodar

#### 1. Gerar o CSV de adjacências

```bash
python -m src.cli gerar
```

Lê `data/aeroportos_data.csv` e grava `data/adjacencias_aeroportos.csv`.

#### 2. Validar o modelo

```bash
python -m src.cli validar
```

Confirma conectividade, conexões intra/inter-regionais e densidade.

#### 3. Calcular métricas (Partes 3 e 4)

```bash
python -m src.cli metricas
```

Gera:
- `out/global.json` — ordem, tamanho, densidade do grafo completo
- `out/regioes.json` — métricas dos 5 subgrafos regionais
- `out/ego_aeroportos.csv` — grau, ordem_ego, tamanho_ego, densidade_ego por aeroporto
- `out/graus.csv` — ranking de graus

#### 4. Calcular distâncias (Parte 6 — Dijkstra)

```bash
python -m src.cli distancias
```

Lê `data/rotas.csv` e grava `out/distancias_rotas.csv` com custo e caminho mínimo para cada par, incluindo os obrigatórios Recife → Porto Alegre e Manaus → São Paulo.

#### 5. Gerar todas as visualizações (Req 7, 8 e 10)

```bash
python -m src.cli viz
```

Executa todos os requisitos de visualização de uma só vez.

#### 6. Gerar apenas as visualizações exploratórias e explanatórias (Req 10)

```bash
python -m src.cli analise
```

### Arquivos de saída — Parte 1

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
| `explr_dispersao_grau_densidade.png` | Req 10 | Exploratória: scatter grau × densidade-ego |
| `explr_matriz_regioes.png` | Req 10 | Exploratória: heatmap de conexões entre regiões |
| `expl_dominancia_hubs.png` | Req 10 | Explanatória: dominância dos 3 hubs nacionais |
| `expl_densidade_regioes.png` | Req 10 | Explanatória: densidade intra-regional vs. global |

---

## Parte 2 — Rede de Assistências da NBA

### Dataset

`data/dataset_parte2/nba_graph_final.csv` — dígrafo de assistências entre jogadores da NBA.

| Campo | Tipo | Significado |
|---|---|---|
| `source` | string | Jogador que realizou a assistência |
| `target` | string | Jogador que converteu a cesta |
| `weight` | float | Pontos totais gerados via essa parceria |
| `cost` | float | `1 / weight` — custo para algoritmos de menor caminho |

Escala: **3.520 jogadores**, **83.649 arestas**, densidade ≈ 0,0068.

### Modelagem do dígrafo

A aresta `(u → v, weight=w)` representa "u assistiu v, gerando w pontos". O custo inverso (`cost = 1/w`) permite encontrar a parceria de maior produtividade pelo menor caminho de custo.

**Sistema de tiers** (baseado em grau total = out-degree + in-degree):

| Tier | Faixa | Cor |
|---|---|---|
| S — Lenda | ≥ 200 | dourado |
| A — Elite | 100–199 | laranja |
| B — Alto | 50–99 | azul claro |
| C — Médio | 20–49 | verde |
| D — Base | < 20 | roxo |

### Como rodar

```bash
python -m src.cli parte2
```

Carrega o dígrafo NBA, executa BFS/DFS/Dijkstra/Bellman-Ford em fontes selecionadas, gera todas as visualizações e salva `out/parte2_report.json`.

### Algoritmos — dígrafo (`src/graphs/digraph_algorithms.py`)

Todos implementados sem bibliotecas externas para grafos:

| Função | Descrição |
|---|---|
| `bfs_directed(g, source)` | BFS iterativo; retorna ordem, camadas e predecessores |
| `dfs_directed(g, source)` | DFS iterativo; classifica arestas em `tree / back / forward / cross` e detecta ciclos |
| `dijkstra_directed(g, source, target)` | Dijkstra com early termination; usa `cost` como peso |
| `bellman_ford(g, source, weight_fn)` | Bellman-Ford com detecção de ciclo negativo e peso customizável |
| `reconstruir_caminho_di(prev, source, target)` | Reconstrói o caminho a partir do vetor de predecessores |

**Casos de teste do Bellman-Ford:**
- **Sem ciclo negativo** — subgrafo BFS de L. James (árvore BFS = DAG); peso = `cost - 0.05`
- **Com ciclo negativo** — vizinhança 1-hop de G. Antetokounmpo incluindo back-edges; mesmo peso

**Fontes usadas em `python -m src.cli parte2`:**

| Algoritmo | Fontes / Pares |
|---|---|
| BFS | G. Antetokounmpo, T. Young, L. James |
| DFS | G. Antetokounmpo, T. Young, L. James |
| Dijkstra | Antetokounmpo→Young, Antetokounmpo→James, Antetokounmpo→Simmons, Young→Lopez, Young→Lillard |
| Bellman-Ford | subgrafo L. James (sem ciclo) e vizinhança Giannis (com ciclo) |

### Arquivos de saída — Parte 2

| Arquivo | Descrição |
|---|---|
| `parte2_distribuicao_graus.png` | Scatter log-log de distribuição de grau de saída e de entrada |
| `parte2_top_passadores.png` | Top 15 jogadores com mais assistências (out-degree) |
| `parte2_top_recebedores.png` | Top 15 jogadores que mais receberam assistências (in-degree) |
| `parte2_distribuicao_pesos.png` | Histograma de pesos com percentis P50/P90/P99 |
| `parte2_bfs_camadas.png` | Barras empilhadas de nós por camada BFS para cada fonte |
| `parte2_comparacao_algoritmos.png` | Comparação de tempo de execução (ms) dos quatro algoritmos |
| `parte2_report.json` | Relatório JSON com estatísticas, rankings e resultados de todos os algoritmos |

---

## Frontend React

### Rotas

| URL | Página | Conteúdo |
|---|---|---|
| `/` | Landing | Cards de navegação para Parte 1 e Parte 2 |
| `/parte1` | Home | Grafo interativo de aeroportos + painel de algoritmos (BFS, DFS, Dijkstra) |
| `/parte1/dashboard` | Dashboard | Métricas globais, regionais, ego-redes e rotas |
| `/parte2` | NbaGraph | Subgrafo das estrelas NBA com algoritmos (BFS, DFS, Dijkstra, Bellman-Ford) |
| `/parte2/dashboard` | NbaDashboard | Distribuição de graus, top passadores/recebedores, pesos |

### Como rodar

**Terminal 1 — Backend:**

```bash
python -m uvicorn src.api:app --reload
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

O build de produção (`npm run build`) gera `frontend/dist/`, que é servido automaticamente pelo FastAPI em `http://localhost:8000`.

---

## API REST (`src/api.py`)

### Parte 1 — Aeroportos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/status` | Verifica existência dos arquivos de dados |
| `POST` | `/api/upload/{tipo}` | Faz upload de CSV (`aeroportos`, `adjacencias`, `rotas`) |
| `POST` | `/api/run/gerar` | Gera `adjacencias_aeroportos.csv` |
| `POST` | `/api/run/metricas` | Calcula e retorna métricas (Partes 3 e 4) |
| `POST` | `/api/run/distancias` | Calcula distâncias Dijkstra (Parte 6) |
| `POST` | `/api/run/viz` | Gera todas as visualizações |
| `GET` | `/api/data/graph` | Nós e arestas do grafo com métricas de ego-rede |
| `GET` | `/api/data/metrics` | Métricas globais (`global.json`) |
| `GET` | `/api/data/regions` | Métricas regionais (`regioes.json`) |
| `GET` | `/api/data/grades` | Ranking de graus |
| `GET` | `/api/data/ego` | Ego-redes por aeroporto |
| `GET` | `/api/data/routes` | Distâncias calculadas |
| `GET` | `/api/data/aviation-stats` | Estatísticas do setor aéreo |
| `GET` | `/api/data/caminhos-obrigatorios` | Caminhos REC→POA e MAO→GRU |
| `POST` | `/api/algorithm` | Executa BFS / DFS / DIJKSTRA sobre o grafo de aeroportos |

### Parte 2 — NBA

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/parte2/graph` | Subgrafo das estrelas (nós com tier, arestas com peso) |
| `GET` | `/api/parte2/stats` | Estatísticas do dígrafo completo (graus, pesos, top 15) |
| `GET` | `/api/parte2/report` | Relatório completo (`parte2_report.json`) |
| `POST` | `/api/parte2/algorithm` | Executa BFS / DFS / DIJKSTRA / BELLMAN-FORD sobre o subgrafo |

---

## Algoritmos — grafo não-dirigido (`src/graphs/algorithms.py`)

Todos sem uso de bibliotecas externas para as implementações:

| Algoritmo | Descrição |
|---|---|
| **BFS** | Busca em largura iterativa; retorna camadas, distâncias e predecessores |
| **DFS** | Busca em profundidade iterativa; classifica arestas (árvore/retorno) e detecta ciclos |
| **Dijkstra** | Menor caminho com pesos ≥ 0; usa `heapq` da stdlib; rejeita pesos negativos |

---

## Referência completa de comandos CLI

| Comando | Descrição |
|---|---|
| `python -m src.cli gerar` | Gera `data/adjacencias_aeroportos.csv` |
| `python -m src.cli validar` | Valida os dois CSVs da Parte 1 |
| `python -m src.cli metricas` | Métricas globais, regionais e ego-redes (Partes 3–4) |
| `python -m src.cli distancias` | Menor caminho Dijkstra para pares em `rotas.csv` (Parte 6) |
| `python -m src.cli viz` | Todas as visualizações da Parte 1 (Req 7, 8 e 10) |
| `python -m src.cli analise` | Só as visualizações exploratórias/explanatórias (Req 10) |
| `python -m src.cli parte2` | Parte 2: BFS/DFS/Dijkstra/Bellman-Ford no dígrafo NBA + visualizações |

Todos os comandos aceitam `--root PATH` para especificar a raiz do projeto manualmente.

---

## Bibliotecas utilizadas

| Biblioteca | Uso |
|---|---|
| `matplotlib` | Visualizações estáticas (Parte 1 Req 7/8/10, Parte 2) |
| `numpy` | Paletas de cor e cálculos auxiliares |
| `networkx` | Layout gráfico interno (não utilizado para algoritmos) |
| `fastapi` + `uvicorn` | API REST para o frontend React |
| `python-multipart` | Upload de arquivos CSV via API |
| `heapq` | Fila de prioridade no Dijkstra (stdlib Python) |
| `reportlab` | Geração dos PDFs de análise (opcional) |

`networkx`, `igraph` e `graph-tool` **não são utilizados para implementação de algoritmos** — proibidos pelo enunciado.

---

## Testes

```bash
python -m pytest tests/ -v
```

| Arquivo | Cobre |
|---|---|
| `tests/test_bfs.py` | Camadas corretas, distâncias, predecessores, source inválido |
| `tests/test_dfs.py` | Detecção de ciclo, classificação de arestas (árvore/retorno), source inválido |
| `tests/test_dijkstra.py` | Caminho mínimo, grafo desconectado, rejeição de peso negativo, source inválido |
| `tests/test_bellman_ford.py` | Menor caminho, arestas negativas sem ciclo, detecção de ciclo negativo, peso customizado, source inválido |
