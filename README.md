# projeto-grafos

Projeto para a disciplina de grafos — **Parte 1: modelagem** do grafo de aeroportos do Brasil.

## O que há no CSV de nós

O arquivo [`data/aeroportos_data.csv`](data/aeroportos_data.csv) lista aeroportos com:

- **Código IATA** (rótulo do nó no grafo, ex.: `REC`, `GRU`)
- **Cidade**
- **Região** do Brasil

Não há conexões explícitas nesse arquivo; o grupo define o modelo de arestas.

## Resultado da modelagem

1. **Nós:** grafo rotulado — cada nó é um aeroporto; rótulo = IATA.
2. **Arestas:** arquivo [`data/adjacencias_aeroportos.csv`](data/adjacencias_aeroportos.csv), grafo **não-direcionado**, **uma linha por par** (o par é salvo com `origem` < `destino` em ordem lexicográfica).

### Objetos em código ([`src/graphs/graph.py`](src/graphs/graph.py))

- **`Node`** — aeroporto: `iata` (rótulo), `cidade`, `regiao`; propriedade `rotulo` retorna o IATA.
- **`Edge`** — aresta com `origem`, `destino`, `peso`, `tipo_conexao`, `justificativa`.
- **`Graph`** — conjunto de `Node`, arestas não direcionadas, vizinhança e `is_connected()`.

Fábricas:

- **`graph_from_model_files()`** — lê `aeroportos_data.csv` e monta arestas com a **mesma regra** que gera o CSV (útil sem depender do arquivo de adjacências já gravado).
- **`graph_from_csv_files()`** — lê `aeroportos_data.csv` + `adjacencias_aeroportos.csv` do disco.

Exemplo (na raiz do repo): `PYTHONPATH=. python3 -c "from src.graphs import graph_from_model_files as m; g=m(); print(g.num_nodes(), g.num_edges(), g.is_connected())"`

Formato obrigatório:

`origem,destino,tipo_conexao,justificativa,peso`

### Modelo do grupo (Regional + Hub + Hub-Hub)

- **regional** — em cada região, todos os aeroportos da região se conectam entre si (clique).
- **hub** — cada aeroporto que não é hub nacional (`GRU`, `GIG`, `BSB`) liga-se a esses hubs que estejam **fora** da sua região.
- **hub-hub** — eixos entre hubs nacionais ainda não cobertos pelo regional: `GRU–BSB` e `GIG–BSB` (`GRU–GIG` já é regional, ambos no Sudeste).

### Régua de pesos (Seção 5)

| `tipo_conexao` | Peso | Significado |
|----------------|------|-------------|
| `regional`     | 1.0  | Voo curto, mesma região |
| `hub`          | 2.0  | Conexão via hub nacional (outra região) |
| `hub-hub`      | 1.5  | Eixo entre hubs nacionais |

### Requisitos obrigatórios

- Grafo **conectado**
- Conexão entre aeroportos da **mesma região**
- Conexão entre **regiões diferentes**
- Grafo **não trivial** (checagem de densidade no validador interno)

## Gerar e validar o CSV de adjacências

Na raiz do repositório, com **Python 3.11+**:

```bash
python3 -m src.graphs.io gerar
python3 -m src.graphs.io validar
```

O módulo [`src/graphs/io.py`](src/graphs/io.py) lê `data/aeroportos_data.csv`, escreve `data/adjacencias_aeroportos.csv` e o comando `validar` confere os requisitos acima.
