import { useNavigate } from 'react-router-dom'

function ArrowIcon() {
  return (
    <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PartCard({ emoji, badge, title, subtitle, bullets, accent, glow, onOpen, onDashboard }) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col rounded-2xl border border-slate-700/80 bg-slate-800/40 p-7 cursor-pointer overflow-hidden
        transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/70 hover:-translate-y-1 hover:shadow-2xl"
    >
      {}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20 transition-opacity duration-200 group-hover:opacity-40"
        style={{ background: glow }}
      />

      <div className="relative flex items-center gap-4 mb-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: `${accent}1f`, border: `1px solid ${accent}55` }}
        >
          {emoji}
        </div>
        <div>
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-950"
            style={{ background: accent }}
          >
            {badge}
          </span>
          <h2 className="mt-1.5 text-xl font-bold text-slate-50 leading-tight">{title}</h2>
        </div>
      </div>

      <p className="relative text-sm text-slate-400 mb-5 leading-relaxed">{subtitle}</p>

      <ul className="relative space-y-2 mb-7 text-sm text-slate-300 flex-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accent }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="relative flex items-center gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen() }}
          className="group/btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: accent, boxShadow: `0 8px 20px -8px ${accent}` }}
        >
          Abrir grafo <ArrowIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDashboard() }}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:text-white active:scale-[0.98]"
          style={{ border: `1px solid ${accent}66`, background: `${accent}12` }}
        >
          Dashboard
        </button>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-900 px-6 py-14 overflow-hidden">
      {}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(96,165,250,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(251,191,36,0.07),transparent_55%)]" />

      <div className="relative w-full max-w-5xl">
        <header className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-slate-400 border border-slate-700 bg-slate-800/50 mb-4">
            Estruturas de Dados · Visualização de Grafos
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-50">Projeto de Grafos</h1>
          <p className="mt-3 text-base text-slate-400">
            Escolha a parte do projeto que deseja explorar.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PartCard
            emoji="✈️"
            badge="Parte 1"
            title="Rede de Aeroportos do Brasil"
            subtitle="Grafo não-dirigido ponderado das conexões entre aeroportos brasileiros."
            accent="#60a5fa"
            glow="#3b82f6"
            bullets={[
              'Visualização interativa por região e tipo de ligação',
              'BFS, DFS e Dijkstra com caminhos obrigatórios',
              'Dashboard com graus, densidade e dados da aviação',
            ]}
            onOpen={() => navigate('/parte1')}
            onDashboard={() => navigate('/parte1/dashboard')}
          />

          <PartCard
            emoji="🏀"
            badge="Parte 2"
            title="Rede de Assistências da NBA"
            subtitle="Grafo dirigido ponderado de assistências entre jogadores da NBA."
            accent="#fbbf24"
            glow="#f59e0b"
            bullets={[
              'Visualização interativa com tiers, busca e vizinhança',
              'BFS, DFS, Dijkstra e Bellman-Ford sobre grafo dirigido',
              'Dashboard com passadores, graus, pesos e desempenho',
            ]}
            onOpen={() => navigate('/parte2')}
            onDashboard={() => navigate('/parte2/dashboard')}
          />
        </div>
      </div>
    </div>
  )
}
