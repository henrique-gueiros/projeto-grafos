import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend, LineChart, Line, ScatterChart,
  Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { getGraphData, getAviationStats } from '../api.js'
import { REGION_HEX } from '../components/GraphViewer.jsx'
import InsightModal from '../components/InsightModal.jsx'

const REGIONS = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']

const HUB_TIERS = [
  { label: 'Hub Nacional',       color: '#ef4444', minGrau: 15 },
  { label: 'Hub Regional',       color: '#f97316', minGrau: 7  },
  { label: 'Aeroporto Regional', color: '#14b8a6', minGrau: 0  },
]

const BLUE_PURPLE_RAMP = ['#7dd3fc', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc']

function getHubTier(grau) {
  for (const t of HUB_TIERS) {
    if (grau >= t.minGrau) return t
  }
  return HUB_TIERS[HUB_TIERS.length - 1]
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? p.color }}>
          {p.name}: <b>{typeof p.value === 'number'
            ? p.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
            : p.value}</b>
        </p>
      ))}
    </div>
  )
}

function Top15Tooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-sm text-white mb-1">{label}</p>
      {d?.tier && <p className="mb-0.5" style={{ color: d.tierColor }}>{d.tier}</p>}
      <p style={{ color: payload[0]?.fill ?? '#94a3b8' }}>
        Grau: <b>{payload[0]?.value}</b>
      </p>
    </div>
  )
}

function DegreeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-sm text-white mb-1">Grau {label}</p>
      {d?.tier && <p className="mb-0.5" style={{ color: d.tierColor }}>{d.tier}</p>}
      <p style={{ color: payload[0]?.fill ?? '#94a3b8' }}>
        Aeroportos: <b>{payload[0]?.value}</b>
      </p>
    </div>
  )
}

function Chip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all
        ${active
          ? 'border-transparent text-slate-900'
          : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-300'}`}
      style={active ? { background: color || '#3b82f6' } : {}}
    >
      {label}
    </button>
  )
}

function EmptyChart({ msg }) {
  return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">{msg}</div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [graphData, setGraphData] = useState(null)
  const [aviationStats, setAviationStats] = useState(null)
  const [filters, setFilters] = useState({ regioes: [] })

  useEffect(() => {
    getGraphData().then(setGraphData).catch(() => {})
    getAviationStats().then(setAviationStats).catch(() => {})
  }, [])

  const degreeMap = useMemo(() => {
    if (!graphData) return {}
    const m = {}
    graphData.edges.forEach((e) => {
      m[e.from] = (m[e.from] || 0) + 1
      m[e.to] = (m[e.to] || 0) + 1
    })
    return m
  }, [graphData])

  const visibleNodes = useMemo(() => {
    if (!graphData) return []
    return graphData.nodes.filter((n) =>
      filters.regioes.length === 0 || filters.regioes.includes(n.regiao),
    )
  }, [graphData, filters.regioes])

  const visibleEdges = useMemo(() => {
    if (!graphData) return []
    const vns = new Set(visibleNodes.map((n) => n.id))
    return graphData.edges.filter((e) => vns.has(e.from) && vns.has(e.to))
  }, [graphData, visibleNodes])

  const top15 = useMemo(() =>
    visibleNodes
      .map((n) => ({ iata: n.id, regiao: n.regiao, grau: degreeMap[n.id] ?? 0 }))
      .sort((a, b) => b.grau - a.grau)
      .slice(0, 15)
      .map((n) => {
        const t = getHubTier(n.grau)
        return { ...n, tier: t.label, tierColor: t.color }
      }),
    [visibleNodes, degreeMap],
  )

  const degreeHist = useMemo(() => {
    const freq = {}
    visibleNodes.forEach((n) => {
      const g = degreeMap[n.id] ?? 0
      freq[g] = (freq[g] || 0) + 1
    })
    return Object.entries(freq)
      .map(([g, c]) => {
        const grau = Number(g)
        const t = getHubTier(grau)
        return { grau, aeroportos: c, tier: t.label, tierColor: t.color }
      })
      .sort((a, b) => a.grau - b.grau)
  }, [visibleNodes, degreeMap])

  const regionStats = useMemo(() => {
    if (!graphData) return []
    const byRegion = {}
    visibleNodes.forEach((n) => {
      if (!byRegion[n.regiao]) byRegion[n.regiao] = new Set()
      byRegion[n.regiao].add(n.id)
    })
    return Object.entries(byRegion).map(([regiao, nodes]) => {
      const ordem = nodes.size
      const tamanho = graphData.edges.filter((e) => nodes.has(e.from) && nodes.has(e.to)).length
      const densidade = ordem < 2 ? 0 : parseFloat(((2 * tamanho) / (ordem * (ordem - 1))).toFixed(4))
      return { regiao, ordem, tamanho, densidade }
    }).sort((a, b) => a.regiao.localeCompare(b.regiao))
  }, [graphData, visibleNodes])

  const regionDensity = useMemo(() =>
    regionStats.map((r) => ({ regiao: r.regiao, densidade: r.densidade })),
    [regionStats],
  )

  const globalDensity = useMemo(() => {
    const n = visibleNodes.length
    const e = visibleEdges.length
    return n < 2 ? 0 : parseFloat(((2 * e) / (n * (n - 1))).toFixed(2))
  }, [visibleNodes, visibleEdges])

  const regionCountRanked = useMemo(() =>
    [...regionStats].sort((a, b) => a.ordem - b.ordem),
    [regionStats],
  )

  const passageirosRanked = useMemo(() =>
    aviationStats
      ? [...aviationStats.passageiros_domesticos].sort((a, b) => a.milhoes - b.milhoes)
      : [],
    [aviationStats],
  )

  const cargaRanked = useMemo(() =>
    aviationStats
      ? [...aviationStats.carga_aerea].sort((a, b) => a.mil_ton - b.mil_ton)
      : [],
    [aviationStats],
  )

  const toggleFilter = (val) =>
    setFilters((f) => ({
      regioes: f.regioes.includes(val)
        ? f.regioes.filter((x) => x !== val)
        : [...f.regioes, val],
    }))

  const clearFilters = () => setFilters({ regioes: [] })
  const hasFilter = filters.regioes.length > 0

  const statsLabel = graphData
    ? `${visibleNodes.length}/${graphData.nodes.length} aeroportos · ${visibleEdges.length}/${graphData.edges.length} ligacoes`
    : 'Carregando...'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-800/95 backdrop-blur border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/parte1')} className="btn-secondary text-sm">
            Voltar
          </button>
          <h1 className="text-base font-bold text-slate-100">Parte 1 — Dashboard de Analise</h1>
        </div>
        <span className="text-xs text-slate-500">{statsLabel}</span>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title mb-0">Filtros</p>
            {hasFilter && (
              <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-300">
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {REGIONS.map((r) => (
              <Chip
                key={r}
                label={r}
                color={REGION_HEX[r]}
                active={filters.regioes.includes(r)}
                onClick={() => toggleFilter(r)}
              />
            ))}
          </div>
        </section>

        {!graphData && (
          <div className="card border-amber-700 bg-amber-900/20 text-amber-300 text-sm">
            Grafo nao carregado. Certifique-se de que os CSVs estao disponiveis.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Top 15 Aeroportos Mais Conectados</p>
              <InsightModal
                title="Hubs Aeroportuários"
                icon="✈️"
                accent="#ef4444"
                insight={`GRU (Guarulhos), GIG (Galeão) e BSB (Brasília) são os três hubs nacionais definidos no modelo: cada um conecta-se a todos os demais aeroportos, independente da região. Isso os torna os nós mais críticos da rede — sua remoção quebraria a conectividade global.

Hubs Regionais (grau 7–14) atuam como pontes locais: cada região tem pelo menos um aeroporto que concentra as ligações intra-regionais e serve de antessala para os hubs nacionais.

A diferença de grau entre aeroportos regionais comuns (grau 4–6) e os hubs nacionais (grau 15+) reflete o modelo híbrido adotado: clique regional + ligações hub. Isso garante conectividade máxima com um número mínimo de arestas.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Grau = numero de conexoes diretas. Aeroportos com grau alto funcionam como hubs.
            </p>
            {top15.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={top15} layout="vertical" margin={{ left: 10, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="iata" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={44} interval={0} />
                    <Tooltip content={<Top15Tooltip />} />
                    <Bar dataKey="grau" name="Grau" radius={[0, 4, 4, 0]}>
                      {top15.map((d) => (
                        <Cell key={d.iata} fill={d.tierColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {HUB_TIERS.map((t) => (
                    <span key={t.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: t.color }} />
                      {t.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Quantidade de Aeroportos por Regiao</p>
              <InsightModal
                title="Distribuição Regional"
                icon="🗺️"
                accent="#a78bfa"
                insight={`O Nordeste concentra o maior número de aeroportos do modelo (6), refletindo a extenso litoral e a demanda turística de estados como Bahia, Ceará e Pernambuco. O Sul, com 3 aeroportos, é a região mais compacta — mas altamente interconectada graas ao clique regional.

Centro-Oeste tem apenas 2 aeroportos (BSB e GYN), mas ambos são estratégicos: BSB é um hub nacional e GYN serve como anteposto para o interior. A razão de densidade dessas regiões menores é 1,0 (clique completo).

Essa distribuição não é proporcional ao PIB regional: o Sudeste, que responde por ~53% do PIB nacional, tem 5 aeroportos — mas seus 3 hubs nacionais compensam numericamente com grau altamente superior.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Numero de aeroportos por regiao, do menor para o maior. Quanto mais roxo, mais aeroportos.
            </p>
            {regionCountRanked.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={regionCountRanked} margin={{ left: 0, right: 10, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="regiao"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      angle={-12}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="ordem" name="Aeroportos" radius={[3, 3, 0, 0]}>
                      {regionCountRanked.map((r, i) => (
                        <Cell key={r.regiao} fill={BLUE_PURPLE_RAMP[i] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 justify-center text-xs text-slate-400">
                  <span>Menos</span>
                  <div className="flex gap-0.5">
                    {BLUE_PURPLE_RAMP.map((c) => (
                      <span key={c} className="w-4 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                    ))}
                  </div>
                  <span>Mais</span>
                </div>
              </>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Distribuicao de Graus</p>
              <InsightModal
                title="Distribuição de Graus — Topologia da Rede"
                icon="📊"
                accent="#f97316"
                insight={`O histograma de graus revela três grupos naturais na rede: aeroportos de grau baixo (regionais sem ligações hub), grau médio (hubs regionais com algumas ligações inter-regionais) e grau alto (hubs nacionais com conectividade universal).

A maioria dos aeroportos cai na faixa de grau 4–6: eles formam clôs regionais densas, mas dependem dos hubs para alcançar outras regiões. Esse é o padrão esperado em redes hierárquicas como malhas aeroviárias.

Junto com o gráfico de Top 15, este gráfico confirma que a rede não é aleatória (que teria uma distribuição de Poisson) — é estruturada e proposital. A escolha do modelo híbrido (regional + hub) cria exatamente esta bimodalidade.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Frequencia de cada valor de grau. Cores iguais ao Top 15: vermelho = Hub Nacional, laranja = Hub Regional, verde = Regional.
            </p>
            {degreeHist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={degreeHist} margin={{ left: 0, right: 10, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="grau"
                      label={{ value: 'Grau', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      label={{ value: 'Aeroportos', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip content={<DegreeTooltip />} />
                    <Bar dataKey="aeroportos" name="Aeroportos" radius={[3, 3, 0, 0]}>
                      {degreeHist.map((d) => (
                        <Cell key={d.grau} fill={d.tierColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {HUB_TIERS.map((t) => (
                    <span key={t.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: t.color }} />
                      {t.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">Densidade por Regiao</p>
              <InsightModal
                title="Densidade Regional vs. Global"
                icon="🔗"
                accent="#14b8a6"
                insight={`Todas as regiões têm densidade intra-regional de 1,0 por design: o modelo conecta todos os aeroportos da mesma região em um clique completo. Isso garante que qualquer aeroporto regional alcance outro da mesma região em exatamente 1 salto.

A linha tracejada representa a densidade global da rede, muito inferior a 1,0. Essa diferença brutal ilustra o princípio estrutural: é fácil voar dentro de uma região, mas cruzar regiões exige obrigatoriamente passar por um hub nacional.

Essa arquitetura reduz o número total de arestas necessárias (eficiência de armazenamento e processamento) ao mesmo tempo que mantém a conectividade universal, um trade-off clássico em design de redes.`}
              />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Cada regiao forma um clique completo (densidade = 1,0). A linha tracejada marca a densidade global da rede — cruzar regioes sempre exige escala.
            </p>
            {regionDensity.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={regionDensity} margin={{ left: 0, right: 10, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="regiao"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    angle={-12}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1.1]} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine
                    y={globalDensity}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: `Global ≈ ${globalDensity}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Bar dataKey="densidade" name="Densidade" radius={[3, 3, 0, 0]}>
                    {regionDensity.map((r) => (
                      <Cell key={r.regiao} fill={REGION_HEX[r.regiao] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

        </div>

        {aviationStats && (
          <>
            <p className="text-xs text-slate-500 mt-2 mb-1 px-1">
              Dados externos — Fonte: {aviationStats.fonte}
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              <section className="card">
                <div className="flex items-center justify-between mb-1">
                  <p className="section-title mb-0">Passageiros Domesticos por Regiao</p>
                  <InsightModal
                    title="Passageiros Domésticos"
                    icon="👥"
                    accent="#60a5fa"
                    insight={`O Sudeste domina o volume de passageiros domésticos, concentrando os dois maiores aeroportos do Brasil (GRU e GIG). Essa supremacia reflete tanto a densidade populacional da região quanto sua função de hub de transferência: muitos voos de outras regiões fazem escala em São Paulo ou Rio antes de seguir ao destino final.

O Nordeste surge em segundo lugar, impulsionado principalmente pelo turismo. Isso cria um padrão sazonal interessante: a conectividade da região é alta em número de aeroportos, mas moderada em volume, pois os passageiros se distribuem por mais destinos com menos concentração por nó.

Compare com o gráfico de densidade: regiões com menos aeroportos (Sul, Centro-Oeste) têm alta densidade interna, mas participam de um volume proporcional menor de passageiros totais.`}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Volume de passageiros domesticos transportados em 2023 (milhoes), do menor para o maior. Quanto mais roxo, maior o volume.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={passageirosRanked} margin={{ left: 0, right: 24, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="regiao" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-12} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" M" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="milhoes" name="Passageiros (M)" radius={[3, 3, 0, 0]}>
                      {passageirosRanked.map((r, i) => (
                        <Cell key={r.regiao} fill={BLUE_PURPLE_RAMP[i] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 justify-center text-xs text-slate-400">
                  <span>Menos</span>
                  <div className="flex gap-0.5">
                    {BLUE_PURPLE_RAMP.map((c) => (
                      <span key={c} className="w-4 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                    ))}
                  </div>
                  <span>Mais</span>
                </div>
              </section>

              <section className="card">
                <div className="flex items-center justify-between mb-1">
                  <p className="section-title mb-0">Volume de Carga Aerea por Regiao</p>
                  <InsightModal
                    title="Carga Aérea Regional"
                    icon="📦"
                    accent="#818cf8"
                    insight={`O Sudeste concentra a esmagadora maioria da carga aérea doméstica, refletindo a localização do principal centro logístico do país (GRU/Viracopos). A carga aérea é ainda mais concentrada geograficamente do que os passageiros: enquanto passageiros se distribuem por destinos turísticos, a carga segue rotas industriais e comerciais.

O Norte e o Centro-Oeste, apesar de suas vastões territórios, transportam volume relativamente pequeno. Isso evidencia a dependência dessas regiões de modais terrestres e fluviais para distribuição interna.

Um insight importante de grafos: a centralidade de carga aérea num único hub (GRU) torna a rede de logística aérea altamente vulnerável. Uma interrupção em Guarulhos afetaria todo o fluxo nacional de carga express.`}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Carga transportada em 2023 (mil toneladas), do menor para o maior. Quanto mais roxo, maior o volume.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cargaRanked} margin={{ left: 0, right: 24, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="regiao" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-12} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" kt" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="mil_ton" name="Carga (mil t)" radius={[3, 3, 0, 0]}>
                      {cargaRanked.map((r, i) => (
                        <Cell key={r.regiao} fill={BLUE_PURPLE_RAMP[i] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 justify-center text-xs text-slate-400">
                  <span>Menos</span>
                  <div className="flex gap-0.5">
                    {BLUE_PURPLE_RAMP.map((c) => (
                      <span key={c} className="w-4 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                    ))}
                  </div>
                  <span>Mais</span>
                </div>
              </section>

              <section className="card xl:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="section-title mb-0">Evolucao de Voos por Regiao (2019–2023)</p>
                  <InsightModal
                    title="Impacto da Pandemia e Recuperação"
                    icon="📉"
                    accent="#ef4444"
                    insight={`O colapso de 2020 é visível em todas as regiões: a pandemia de COVID-19 reduziu o número de voos domésticos em até 80% em relação ao pico de 2019. Nenhuma região foi poupada, mas a recuperação foi diferenciada.

O Sudeste recuperou mais rápido, apoiado pela demanda corporativa e pela diversidade de destinos. O Norte, que depende fortemente da aviação como meio de transporte primário (dada a ausência de estradas), viu uma recuperação mais lenta por conta da fragilidade econômica regional.

Do ponto de vista de grafos, a pandemia simulou um ataque coordenado a todos os nós simultaneamente: ao contrário de falhas pontuais (remoção de um hub), o colapso foi sistêmico. A recuperação diferenciada mostra que hubs nacionais se restabelecem antes de aeroportos regionais.`}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Numero de voos domesticos (mil) por ano. Evidencia o impacto da pandemia em 2020
                  e a recuperacao diferenciada entre regioes.
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={aviationStats.crescimento_voos_historico} margin={{ left: 0, right: 24, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="ano" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" k" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
                    {Object.keys(aviationStats.crescimento_voos_historico[0])
                      .filter((k) => k !== 'ano')
                      .map((regiao) => (
                        <Line
                          key={regiao}
                          type="monotone"
                          dataKey={regiao}
                          stroke={REGION_HEX[regiao] ?? '#64748b'}
                          strokeWidth={2}
                          dot={{ r: 3, fill: REGION_HEX[regiao] ?? '#64748b' }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    <ReferenceLine x={2020} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Pandemia', fill: '#ef4444', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>

              <section className="card xl:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="section-title mb-0">PIB Regional x Conectividade Aerea</p>
                  <InsightModal
                    title="PIB vs. Conectividade"
                    icon="💰"
                    accent="#34d399"
                    insight={`O gráfico de dispersão revela uma correlação positiva entre PIB regional e volume de voos: regiões mais ricas geram e atraem mais tráfego aéreo. O tamanho de cada bolha representa o número de aeroportos no modelo.

O Sudeste é um outlier duplo: maior PIB E maior volume de voos. O Norte apresenta o caso inverso interessante: PIB baixo, mas volume de voos não desprezível, evidenciando o papel estratégico-social da aviação como único modal viável em regiões amazônicas.

Essa relação sugere que a rede de aeroportos modelada, embora baseada em conexões geográficas e estruturais, reflete indiretamente a realidade econômica do país: infraestrutura aérea e desenvolvimento regional se reforçam mutuamente.`}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Relacao entre PIB (bilhoes BRL, 2022) e numero de voos domesticos (mil, 2023)
                  por regiao. Regioes com maior PIB tendem a concentrar mais rotas aereas.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="pib_bilhoes"
                      name="PIB"
                      unit=" Bi"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'PIB (R$ bi)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="voos_mil"
                      name="Voos"
                      unit=" k"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'Voos (mil)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                    />
                    <ZAxis dataKey="aeroportos" range={[60, 400]} name="Aeroportos" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload
                        return (
                          <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
                            <p className="font-semibold mb-1" style={{ color: REGION_HEX[d?.regiao] ?? '#94a3b8' }}>{d?.regiao}</p>
                            <p className="text-slate-300">PIB: <b>R$ {d?.pib_bilhoes?.toLocaleString('pt-BR')} bi</b></p>
                            <p className="text-slate-300">Voos: <b>{d?.voos_mil}k/ano</b></p>
                            <p className="text-slate-300">Aeroportos: <b>{d?.aeroportos}</b></p>
                          </div>
                        )
                      }}
                    />
                    <Scatter data={aviationStats.pib_conectividade} name="Regioes">
                      {aviationStats.pib_conectividade.map((r) => (
                        <Cell key={r.regiao} fill={REGION_HEX[r.regiao] ?? '#64748b'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {aviationStats.pib_conectividade.map((r) => (
                    <span key={r.regiao} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: REGION_HEX[r.regiao] }} />
                      {r.regiao}
                    </span>
                  ))}
                </div>
              </section>

            </div>
          </>
        )}

      </div>
    </div>
  )
}
