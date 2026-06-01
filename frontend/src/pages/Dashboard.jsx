import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend, LineChart, Line, ScatterChart,
  Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { getGraphData, getAviationStats } from '../api.js'
import { REGION_HEX } from '../components/GraphViewer.jsx'

const REGIONS = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']

const BAR_COLORS = [
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#fda4af', '#fca5a1',
]

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
      .slice(0, 15),
    [visibleNodes, degreeMap],
  )

  const degreeHist = useMemo(() => {
    const freq = {}
    visibleNodes.forEach((n) => {
      const g = degreeMap[n.id] ?? 0
      freq[g] = (freq[g] || 0) + 1
    })
    return Object.entries(freq)
      .map(([g, c]) => ({ grau: Number(g), aeroportos: c }))
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
          <button onClick={() => navigate('/')} className="btn-secondary text-sm">
            Voltar
          </button>
          <h1 className="text-base font-bold text-slate-100">Dashboard de Analise</h1>
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
            <p className="section-title">Top 15 Aeroportos Mais Conectados</p>
            <p className="text-xs text-slate-500 mb-4">
              Grau = numero de conexoes diretas. Aeroportos com grau alto funcionam como hubs.
            </p>
            {top15.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={top15} layout="vertical" margin={{ left: 10, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="iata" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={44} interval={0} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="grau" name="Grau" radius={[0, 4, 4, 0]}>
                    {top15.map((d, i) => (
                      <Cell key={d.iata} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <p className="section-title">Quantidade de Aeroportos por Regiao</p>
            <p className="text-xs text-slate-500 mb-4">
              Numero de aeroportos em cada regiao com base no filtro ativo.
            </p>
            {regionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={regionStats} margin={{ left: 0, right: 10, bottom: 24 }}>
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
                    {regionStats.map((r) => (
                      <Cell key={r.regiao} fill={REGION_HEX[r.regiao] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <p className="section-title">Distribuicao de Graus</p>
            <p className="text-xs text-slate-500 mb-4">
              Frequencia de cada valor de grau entre os aeroportos visiveis. Revela concentracao e outliers.
            </p>
            {degreeHist.length > 0 ? (
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
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="aeroportos" name="Aeroportos" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="Sem dados para exibir" />
            )}
          </section>

          <section className="card">
            <p className="section-title">Densidade por Regiao</p>
            <p className="text-xs text-slate-500 mb-4">
              Regioes menores tendem a ter maior densidade interna. Formula: 2|E| / (|V|(|V|-1)).
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
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
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
                <p className="section-title">Passageiros Domesticos por Regiao</p>
                <p className="text-xs text-slate-500 mb-4">
                  Volume de passageiros domesticos transportados em 2023 (milhoes). Destaca o peso
                  do Sudeste no transporte aéreo nacional.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...aviationStats.passageiros_domesticos].sort((a, b) => b.milhoes - a.milhoes)}
                    margin={{ left: 0, right: 24, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="regiao" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-12} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" M" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="milhoes" name="Passageiros (M)" radius={[3, 3, 0, 0]}>
                      {aviationStats.passageiros_domesticos.map((r) => (
                        <Cell key={r.regiao} fill={REGION_HEX[r.regiao] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className="card">
                <p className="section-title">Volume de Carga Aerea por Regiao</p>
                <p className="text-xs text-slate-500 mb-4">
                  Carga transportada em 2023 (mil toneladas). O Sudeste concentra a logistica de
                  exportacao via GRU; o Centro-Oeste reflete o agronegocio.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...aviationStats.carga_aerea].sort((a, b) => b.mil_ton - a.mil_ton)}
                    margin={{ left: 0, right: 24, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="regiao" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-12} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" kt" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="mil_ton" name="Carga (mil t)" radius={[3, 3, 0, 0]}>
                      {aviationStats.carga_aerea.map((r) => (
                        <Cell key={r.regiao} fill={REGION_HEX[r.regiao] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className="card xl:col-span-2">
                <p className="section-title">Evolucao de Voos por Regiao (2019–2023)</p>
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
                <p className="section-title">PIB Regional x Conectividade Aerea</p>
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
