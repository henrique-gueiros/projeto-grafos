import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import { getNbaStats, getNbaReport } from '../api.js'
import InsightModal from '../components/InsightModal.jsx'

const PASSADORES_GRADIENT = [
  '#7c3e00', '#8f4800', '#a35200', '#b75d00', '#c96800',
  '#db7400', '#eb8210', '#f59028', '#f9a34a', '#fbb96e',
  '#fccf96', '#fddbb8', '#fee8d3', '#fff1e8', '#fff8f2',
]

const RECEBEDORES_GRADIENT = [
  '#003f5c', '#00526e', '#006580', '#007891', '#008ba1',
  '#009db0', '#00afbf', '#16bfcc', '#3acfd8', '#5ddee2',
  '#82ecec', '#a8f5f5', '#c8fafc', '#dffcfe', '#f0feff',
]

const WEIGHT_GRADIENT = [
  '#1e1b4b', '#2d2a6e', '#3b378f', '#4845ae', '#5552c8',
  '#6562df', '#7875f0', '#908ef7', '#abaafb', '#c8c7fd',
]

const BFS_LAYER_GRADIENT = [
  '#4a044e', '#6b1a6e', '#8b2c8e', '#a73fac', '#c055c8',
  '#d46edb', '#e48de8', '#efadf2', '#f7ccf9', '#fdecfe',
]

const ALGO_COLORS = {
  BFS: '#38bdf8',        
  DFS: '#4ade80',        
  Dijkstra: '#fbbf24',   
  'Bellman-Ford': '#f472b6', 
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <p className="text-slate-300 font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? p.color }}>
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : p.value}</b>
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ msg }) {
  return <div className="flex items-center justify-center h-48 text-slate-500 text-sm text-center px-6">{msg}</div>
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-2xl font-bold" style={{ color: accent }}>{value}</span>
    </div>
  )
}

export default function NbaDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [reportErr, setReportErr] = useState(false)

  useEffect(() => {
    getNbaStats().then(setStats).catch(() => {})
    getNbaReport().then(setReport).catch(() => setReportErr(true))
  }, [])

  
  const degreeDist = useMemo(() => {
    if (!stats) return []
    return [
      ...stats.out_degree_dist.map((d) => ({ grau: d.grau, freq: d.freq, tipo: 'Saída' })),
      ...stats.in_degree_dist.map((d) => ({ grau: d.grau, freq: d.freq, tipo: 'Entrada' })),
    ]
  }, [stats])

  const outDist = useMemo(() => stats?.out_degree_dist ?? [], [stats])
  const inDist = useMemo(() => stats?.in_degree_dist ?? [], [stats])

  
  const bfsLayers = useMemo(() => {
    if (!report?.bfs) return { data: [], max: 0 }
    const max = Math.max(...report.bfs.map((b) => b.layer_sizes.length))
    const data = report.bfs.map((b) => {
      const row = { source: b.source }
      b.layer_sizes.forEach((s, i) => { row[`L${i}`] = s })
      return row
    })
    return { data, max }
  }, [report])

  
  const perfData = useMemo(() => {
    if (!report) return []
    const last = (s) => s.split(' ').pop()
    const rows = []
    report.bfs?.forEach((r) => rows.push({ label: `BFS ${last(r.source)}`, tempo: r.time_ms, grupo: 'BFS' }))
    report.dfs?.forEach((r) => rows.push({ label: `DFS ${last(r.source)}`, tempo: r.time_ms, grupo: 'DFS' }))
    report.dijkstra?.forEach((r) => rows.push({ label: `Dijk ${last(r.source)}→${last(r.target)}`, tempo: r.time_ms, grupo: 'Dijkstra' }))
    report.bellman_ford?.forEach((r) => rows.push({
      label: `BF ${r.case.includes('sem') ? 's/ciclo' : 'c/ciclo'}`, tempo: r.time_ms, grupo: 'Bellman-Ford',
    }))
    return rows
  }, [report])

  const gs = report?.graph_stats

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-800/95 backdrop-blur border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/parte2')} className="btn-secondary text-sm">Voltar</button>
          <h1 className="text-base font-bold text-slate-100">🏀 Parte 2 — Dashboard da Rede NBA</h1>
        </div>
        <button onClick={() => navigate('/')} className="btn-secondary text-sm">Início</button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Jogadores (nós)" value={(gs?.num_nodes ?? stats?.num_nodes ?? '…').toLocaleString?.('pt-BR') ?? '…'} accent="#4fc3f7" />
          <StatCard label="Assistências (arestas)" value={(gs?.num_edges ?? stats?.num_edges ?? '…').toLocaleString?.('pt-BR') ?? '…'} accent="#ffd54f" />
          <StatCard label="Densidade" value={gs?.density ?? '…'} accent="#81c784" />
          <StatCard label="Grau médio (saída)" value={gs?.out_degree?.mean ?? '…'} accent="#f06292" />
        </div>

        {reportErr && (
          <div className="card border-amber-700 bg-amber-900/20 text-amber-300 text-sm">
            Relatório <code>parte2_report.json</code> não encontrado. Execute{' '}
            <code className="text-amber-200">python -m src.cli parte2</code> para gerar os dados de algoritmos.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {}
          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Top 15 Passadores (grau de saída)</p>
              <InsightModal
                title="Top Passadores"
                icon="🎯"
                accent="#f59028"
                insight={`A rede de assistências NBA exibe uma forte concentração de criatividade em poucos jogadores. O líder em grau de saída conecta-se a mais de 800 parceiros distintos ao longo da carreira — sinal de uma versatilidade tática excepcional.

Essa distribuição assimétrica é característica de redes de "livre escala": a maioria dos jogadores passa para um conjunto restrito de parceiros, enquanto um núcleo de armadores/passadores constrói conexões muito além da média de 23,7 por jogador.

Jogadores do topo desta lista são, estrategicamente, os nós mais críticos da rede: removê-los quebraria dezenas de caminhos de colaboração simultâneos.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Jogadores que assistiram o maior número de parceiros distintos. Grau de saída = nº de destinatários.
            </p>
            {stats?.top_passadores?.length ? (
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={[...stats.top_passadores].reverse()} layout="vertical" margin={{ left: 30, right: 30, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={110} interval={0} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="grau" name="Grau saída" radius={[0, 4, 4, 0]}>
                    {}
                    {[...stats.top_passadores].reverse().map((d, i) => (
                      <Cell key={d.nome} fill={PASSADORES_GRADIENT[i % PASSADORES_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg="Carregando…" />}
          </section>

          {}
          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Top 15 Recebedores (grau de entrada)</p>
              <InsightModal
                title="Top Recebedores"
                icon="🏆"
                accent="#3acfd8"
                insight={`Os jogadores com maior grau de entrada são, em geral, finalizadores eficientes e jogadores de equipe que se movimentam bem sem a bola. Receber assistências de muitos parceiros distintos indica posicionamento tático superior e confiança da equipe inteira.

Diferente do grau de saída (que identifica os "criadores"), o grau de entrada revela os "destinos" preferenciais da rede. Em sistemas de jogo colaborativos, esses jogadores funcionam como concentradores de pontuação.

Compare os dois rankings: se um jogador aparece em ambos, ele possui um perfil bidirecional raro — tanto cria quanto finaliza — o que eleva seu valor estratégico exponencialmente na rede.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Jogadores que mais receberam assistências de parceiros distintos. Grau de entrada = nº de passadores.
            </p>
            {stats?.top_recebedores?.length ? (
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={[...stats.top_recebedores].reverse()} layout="vertical" margin={{ left: 30, right: 30, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={110} interval={0} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="grau" name="Grau entrada" radius={[0, 4, 4, 0]}>
                    {}
                    {[...stats.top_recebedores].reverse().map((d, i) => (
                      <Cell key={d.nome} fill={RECEBEDORES_GRADIENT[i % RECEBEDORES_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg="Carregando…" />}
          </section>

          {}
          <section className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Distribuição de Graus (escala log-log)</p>
              <InsightModal
                title="Distribuição de Graus — Lei de Potência"
                icon="📈"
                accent="#fbbf24"
                insight={`O padrão linear visível na escala log-log confirma que a rede de assistências NBA segue uma lei de potência: P(k) ∝ k^(-γ). Isso é a assinatura de uma rede livre de escala.

Em termos práticos: a grande maioria dos jogadores tem poucos parceiros distintos (grau baixo), enquanto um pequeníssimo grupo de superstars acumula centenas de conexões. Não existe um "jogador médio típico" — a distribuição não tem pico central, apenas uma cauda que decresce exponencialmente.

A separação entre curvas de saída (âmbar) e entrada (ciano) revela uma assimetria interessante: o grau de entrada tende a ser mais concentrado nos hubs do que o de saída, o que indica que a "fama" como finalizador é mais escassa do que a capacidade de distribuição de bola.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Frequência de cada valor de grau (excluindo grau 0). A cauda longa indica poucos jogadores
              com altíssima conectividade — característica de redes livres de escala.
            </p>
            {degreeDist.length ? (
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{ left: 10, right: 24, top: 8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number" dataKey="grau" name="Grau" scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: 'Grau (log)', position: 'insideBottom', offset: -6, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="freq" name="Frequência" scale="log" domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: 'Frequência (log)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  />
                  <ZAxis range={[24, 24]} />
                  <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  {}
                  <Scatter name="Grau de saída" data={outDist} fill="#fbbf24" />
                  <Scatter name="Grau de entrada" data={inDist} fill="#38bdf8" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg="Carregando…" />}
          </section>

          {}
          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Distribuição de Pesos das Assistências</p>
              <InsightModal
                title="Pesos das Assistências"
                icon="⚖️"
                accent="#908ef7"
                insight={`A distribuição de pesos gerados por parceria é fortemente assimétrica à direita: a imensa maioria das duplas gera poucos pontos combinados, enquanto parcerias de élite acumulam valores muito acima da mediana.

O percentil P90 revela que apenas 10% das parcerias geram mais pontos do que esse limiar — essas são as combinações com maior sinergia tática. O P99 representa as duplas historicamente excepcionais (ex: armador criativo + finalizador prolífico).

Para o algoritmo de Dijkstra, o peso de cada aresta é usado invertido (1/peso): parcerias mais fortes têm custo menor no grafo, de modo que o "caminho mais curto" entre dois jogadores equivale ao trajeto de maior sinergia acumulada.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Pontos gerados por parceria, agrupados em faixas.
              {stats?.weight_pct && (
                <> Percentis: P50={stats.weight_pct.p50}, P90={stats.weight_pct.p90}, P99={stats.weight_pct.p99}.</>
              )}
            </p>
            {stats?.weight_hist?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.weight_hist} margin={{ left: 4, right: 10, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="faixa" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
                  <YAxis scale="log" domain={[1, 'auto']} allowDataOverflow tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="freq" name="Arestas" radius={[3, 3, 0, 0]}>
                    {}
                    {stats.weight_hist.map((d, i) => (
                      <Cell key={d.faixa} fill={WEIGHT_GRADIENT[i % WEIGHT_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg="Carregando…" />}
          </section>

          {}
          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Camadas BFS por Fonte</p>
              <InsightModal
                title="Camadas BFS — Raio de Influência"
                icon="🌐"
                accent="#c055c8"
                insight={`A BFS (Busca em Largura) mede o raio de influência de um jogador: em quantos "saltos" de colaboração ele consegue alcançar todos os outros na rede.

Jogadores como Giannis Antetokounmpo e Trae Young alcançam ~873 jogadores em apenas 7–8 camadas — confirmando o famoso fenômeno dos "6 graus de separação", mas em escala ainda menor. LeBron James, operando em uma componente menor (31 nós), tem alcance estrutural mais restrito no subgrafo analisado.

A diferença no tamanho das barras entre camadas revela como a rede "explode" rapidamente: poucas conexões diretas (L1) geram um crescimento exponencial nos níveis seguintes. Isso é típico de redes de mundo pequeno com alta transitividade local.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Quantos jogadores são alcançados em cada nível de distância a partir de cada fonte.
              Fontes com poucas camadas têm alcance limitado.
            </p>
            {bfsLayers.data.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bfsLayers.data} margin={{ left: 4, right: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="source" tick={{ fill: '#cbd5e1', fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                  {}
                  {Array.from({ length: bfsLayers.max }, (_, i) => (
                    <Bar key={i} dataKey={`L${i}`} stackId="bfs" name={`Camada ${i}`}
                      fill={BFS_LAYER_GRADIENT[i % BFS_LAYER_GRADIENT.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg={reportErr ? 'Relatório indisponível' : 'Carregando…'} />}
          </section>

          {}
          <section className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Comparação de Desempenho dos Algoritmos</p>
              <InsightModal
                title="Desempenho dos Algoritmos"
                icon="⏱️"
                accent="#fbbf24"
                insight={`O gráfico em escala logarítmica revela diferenças de até 3 ordens de magnitude entre os algoritmos: BFS e DFS completam em décimos de milissegundo, enquanto Bellman-Ford com ciclo negativo pode levar dezenas de ms.

BFS é o mais rápido porque apenas marca nós como visitados sem calcular pesos. DFS tem custo similar, mas pode variar conforme a profundidade do grafo explorado. Dijkstra precisa manter uma fila de prioridade (heap), tornando-o mais lento — mas ainda muito eficiente para grafos esparsos.

Bellman-Ford com ciclo negativo é o mais custoso: ele relaxa todas as (n-1)×|E| arestas, o que em um subgrafo de 146 nós e ~1.610 arestas gera dezenas de milhares de operações. Seu custo é compensado pela única capacidade de detectar ciclos de peso negativo, impossível com Dijkstra.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tempo de execução (ms, escala log) de cada execução registrada no relatório.
              Bellman-Ford com ciclo negativo é o mais custoso por relaxar todas as arestas n-1 vezes.
            </p>
            {perfData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={perfData} margin={{ left: 4, right: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-35} textAnchor="end" interval={0} height={70} />
                  <YAxis scale="log" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" ms" />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="tempo" name="Tempo (ms)" radius={[3, 3, 0, 0]}>
                    {perfData.map((d, i) => <Cell key={i} fill={ALGO_COLORS[d.grupo] ?? '#64748b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart msg={reportErr ? 'Relatório indisponível' : 'Carregando…'} />}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {Object.entries(ALGO_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{k}
                </span>
              ))}
            </div>
          </section>

        </div>

        {}
        {report?.dijkstra?.length > 0 && (
          <section className="card">
            <p className="section-title">Caminhos Mínimos (Dijkstra)</p>
            <p className="text-xs text-slate-500 mb-4">
              Custo = soma de 1/peso ao longo do caminho. Custos menores indicam parcerias mais fortes (mais pontos gerados).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700 text-left">
                    <th className="py-2 pr-3 font-medium">Origem</th>
                    <th className="py-2 pr-3 font-medium">Destino</th>
                    <th className="py-2 pr-3 font-medium">Custo</th>
                    <th className="py-2 pr-3 font-medium">Saltos</th>
                    <th className="py-2 font-medium">Caminho</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dijkstra.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800 text-slate-300">
                      <td className="py-2 pr-3 whitespace-nowrap">{r.source}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.target}</td>
                      <td className="py-2 pr-3 text-amber-400 font-semibold">{r.cost ?? '—'}</td>
                      <td className="py-2 pr-3">{r.path_len ?? '—'}</td>
                      <td className="py-2 text-slate-400">{r.path ? r.path.join(' → ') : 'sem caminho'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {}
        {report?.bellman_ford?.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.bellman_ford.map((bf, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-title mb-0">Bellman-Ford — {bf.case.includes('sem') ? 'sem ciclo negativo' : 'com ciclo negativo'}</p>
                  <span className={`badge ${bf.has_negative_cycle ? 'badge-missing' : 'badge-ok'}`}>
                    {bf.has_negative_cycle ? 'ciclo detectado' : 'sem ciclo'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{bf.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-slate-400">Fonte: <span className="text-slate-200">{bf.source}</span></p>
                  <p className="text-slate-400">Peso: <span className="text-slate-200">{bf.bf_weight_formula}</span></p>
                  <p className="text-slate-400">Nós: <span className="text-slate-200">{bf.subgraph_nodes}</span></p>
                  <p className="text-slate-400">Arestas: <span className="text-slate-200">{bf.subgraph_edges}</span></p>
                  <p className="text-slate-400">Tempo: <span className="text-slate-200">{bf.time_ms} ms</span></p>
                </div>
                {bf.has_negative_cycle && bf.neg_cycle_nodes?.length > 0 && (
                  <p className="text-xs text-slate-500 mt-3">
                    Nós afetados: <span className="text-red-300">{bf.neg_cycle_nodes.slice(0, 8).join(', ')}
                    {bf.neg_cycle_nodes.length > 8 ? '…' : ''}</span>
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

      </div>
    </div>
  )
}
