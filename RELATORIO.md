# Análises do Grafo de Aeroportos

Este arquivo centraliza a análise descritiva das métricas e visualizações geradas para uso do grupo no relatório final (PDF).

## 1. Notas Analíticas - Requisitos 7 e 8

**1. Árvore de Percurso (`arvore_percurso.png`)**
- O que está sendo mostrado: O subgrafo formado pelas arestas dos caminhos mínimos entre Recife-Porto Alegre e Manaus-São Paulo (GRU).
- Insight: Revela a conectividade necessária para realizar essas rotas específicas, destacando a espinha dorsal do percurso.
- Por que: A visualização de grafo é ideal para mostrar conexões topológicas e a hierarquia do trajeto.

**2. Distribuição de Graus (`distribuicao_graus.png`)**
- O que está sendo mostrado: Histograma da frequência de graus (número de conexões) de todos os aeroportos.
- Insight: Permite identificar se a rede segue uma distribuição de lei de potência (típica de redes scale-free) ou se é mais homogênea.
- Por que: Histogramas são a escolha padrão da estatística para mostrar distribuições de variáveis discretas.

**3. Top 10 Aeroportos Mais Conectados (`ranking_conectividade.png`)**
- O que está sendo mostrado: Gráfico de barras ordenado dos aeroportos com o maior número de conexões diretas.
- Insight: Identifica claramente os principais hubs da malha aérea nacional (ex: GRU, BSB).
- Por que: Gráficos de barras ordenados facilitam a comparação direta de grandezas e a identificação de rankings.

**4. Quantidade de Aeroportos por Região (`comparacao_regioes.png`)**
- O que está sendo mostrado: Comparação volumétrica de quantos aeroportos do dataset pertencem a cada região do Brasil.
- Insight: Mostra a cobertura geográfica do grafo e quais regiões possuem maior infraestrutura aeroportuária representada.
- Por que: Gráficos de barras são eficientes para comparar categorias discretas.

**5. Subgrafo da Ego-rede do Hub (`subgrafo_hub.png`)**
- O que está sendo mostrado: Visualização detalhada das conexões diretas do aeroporto com maior grau e as interconexões entre seus vizinhos.
- Insight: Revela a complexidade local e a resiliência do principal ponto de articulação do grafo.
- Por que: Um diagrama de rede local (ego-network) foca no micro-contexto de um nó crítico.


## 2. Análise Exploratória e Explanatória - Requisito 10 (AVD)

### Visualizações Exploratórias
(objetivo: entender o comportamento dos dados)

**1. `explr_dispersao_grau_densidade.png`**
- **Tipo de gráfico:** scatter plot (dispersão)
- **O que está sendo mostrado:** Cada aeroporto é um ponto. Eixo X = grau (número de conexões diretas); Eixo Y = densidade da ego-rede. Cor = região.
- **Insight extraído:** A rede apresenta estrutura bimodal clara. Os 3 hubs nacionais (BSB, GRU, GIG) estão isolados no canto direito inferior: grau máximo (19) com densidade ego igual à densidade global (≈ 0,43). Todos os demais aeroportos, independentemente da região, ficam exatamente em y = 1,0 — suas ego-redes são cliques completos. Isso revela que qualquer aeroporto regional e seus vizinhos formam um grupo totalmente conectado, enquanto os hubs, por conectarem toda a rede, "diluem" sua densidade local.
- **Por que scatter:** Permite visualizar simultaneamente duas variáveis quantitativas e identificar agrupamentos e outliers, sem impor uma ordem artificial.

**2. `explr_matriz_regioes.png`**
- **Tipo de gráfico:** heatmap (mapa de calor)
- **O que está sendo mostrado:** Matriz 5×5 onde cada célula (i, j) exibe o número de arestas entre a região i e a região j. Diagonal = conexões intra-regionais.
- **Insight extraído:** A diagonal domina: cada região tem muitas conexões internas (cliques regionais). Fora da diagonal, as células mais quentes correspondem a pares que envolvem regiões maiores (Nordeste e Sudeste), pois ambas possuem mais aeroportos e portanto mais ligações com os hubs nacionais. Regiões pequenas (Centro-Oeste, Norte) têm menos arestas internas, mas se conectam ao restante pelo hub BSB.
- **Por que heatmap:** Matrizes de adjacência ou contagem entre categorias são naturalmente representadas por heatmaps — a intensidade de cor codifica a magnitude de forma imediata.

### Visualizações Explanatórias
(objetivo: comunicar insights com clareza para não especialistas)

**3. `expl_dominancia_hubs.png`**
- **Tipo de gráfico:** barras horizontais ordenadas
- **Mensagem principal:** "Os 3 hubs nacionais (BSB, GRU e GIG) concentram a maior parcela do grau total da rede — cada um conecta-se diretamente a todos os outros aeroportos."
- **O que está sendo mostrado:** Todos os 20 aeroportos ordenados por grau crescente. Hubs destacados em vermelho, regionais em azul. Anotação mostra o percentual de grau total detido pelos hubs.
- **Insight para o leigo:** Se um hub fechar, boa parte da rede perde rotas diretas — os demais aeroportos dependem dos hubs para se conectar inter-regionalmente.
- **Escolha do gráfico:** Barras horizontais ordenadas facilitam a comparação de ranking e a identificação imediata dos extremos (aeroportos mais e menos conectados).

**4. `expl_densidade_regioes.png`**
- **Tipo de gráfico:** barras verticais com linha de referência
- **Mensagem principal:** "Dentro de cada região, todos os aeroportos se conectam diretamente entre si (densidade = 1,0). A rede nacional, porém, está longe disso (≈ 0,43)."
- **O que está sendo mostrado:** Densidade de cada subgrafo regional (todas = 1,0) versus a linha de referência da densidade global. Cores por região para fácil identificação.
- **Insight para o leigo:** Voar entre dois aeroportos da mesma região é sempre possível sem escala. Para cruzar regiões, o passageiro quase sempre passa por um hub nacional.
- **Escolha do gráfico:** Barras com linha de referência são o padrão para comparar categorias com um benchmark — aqui o benchmark (rede global) é a informação central.

### Padrões Identificados
- A rede segue uma topologia hub-and-spoke: 3 aeroportos centrais servem como pontes inter-regionais, enquanto os demais formam cliques locais.
- Todas as ego-redes de aeroportos não-hub são grafos completos (K_n), o que garante redundância local mas cria dependência dos hubs para rotas longas.
- A densidade global (≈ 0,43) é resultado direto da escolha de modelagem: conectar todos na mesma região + conectar todos ao hub mais próximo, sem criar conexões desnecessárias entre regionais de regiões diferentes.
