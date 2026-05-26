import { useState } from 'react'
import { useMacroData } from './hooks/useMacroData'
import { MacroBanner }         from './components/MacroBanner'
import { FxBiasCards }         from './components/FxBiasCards'
import { FuturesCards }        from './components/FuturesCards'
import { FractalMatrix }       from './components/FractalMatrix'
import { ConfluenceScorecard } from './components/ConfluenceScorecard'
import { NewsFeed, UpcomingCalendar } from './components/NewsAndCalendar'
import { SessionMeter } from './components/SessionMeter'
import { WeeklyTimeline } from './components/WeeklyTimeline'
import { ThesisReport }        from './components/ThesisReport'
import { THESIS_STYLE, REGIME_STYLE, fmtPct, deltaTone } from './lib/confluence'
import type { Thesis, MacroLog, FxBias } from './types/macro'
import {
  RefreshCw, BarChart3, Globe2, TrendingUp, Newspaper,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'fx',      label: 'FX',              sub: 'EUR/USD · GBP/USD',   icon: Globe2      },
  { id: 'futures', label: 'Futuros & Macro',  sub: 'NQ · ES · Régimen',   icon: TrendingUp  },
  { id: 'news',    label: 'Noticias',         sub: 'Titulares · Agenda',  icon: Newspaper   },
] as const

type TabId = typeof TABS[number]['id']

// ─────────────────────────────────────────────────────────────────────────────
// Shared section header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon?: LucideIcon; title: string; subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div>
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DXY context strip (FX tab header)
// ─────────────────────────────────────────────────────────────────────────────

function DxyContext({ data }: { data: MacroLog }) {
  const bias: FxBias = data.fx_bias
  const isStrong = bias === 'USD_STRONG'
  const isWeak   = bias === 'USD_WEAK'

  const tone = isStrong
    ? { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-300',    label: 'USD FUERTE',  sub: 'Presión bajista sobre EUR/USD y GBP/USD' }
    : isWeak
    ? { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', label: 'USD DÉBIL',   sub: 'Soporte alcista para EUR/USD y GBP/USD'  }
    : { bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   text: 'text-amber-300',   label: 'USD MIXTO',   sub: 'Sesgo de dólar sin dirección clara'       }

  const regime = REGIME_STYLE[data.macro_regime]

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 flex flex-col sm:flex-row sm:items-center gap-5`}>
      <div className="flex items-center gap-4 flex-1">
        <div className={`w-3 h-12 rounded-full ${isStrong ? 'bg-rose-500' : isWeak ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-slate-500 uppercase mb-0.5">DXY · Contexto FX</p>
          <p className={`text-2xl font-black tracking-tight ${tone.text}`}>{tone.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tone.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 sm:ml-auto">
        <div className="text-center">
          <p className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase mb-1">DXY</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">{data.dxy_level.toFixed(3)}</p>
          <p className={`text-xs font-semibold tabular-nums ${deltaTone(data.dxy_delta)}`}>{fmtPct(data.dxy_delta)}</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <p className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase mb-1">Régimen</p>
          <p className={`text-sm font-black tracking-tight ${regime.text}`}>{regime.label}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Thesis expectation snippet (FX tab footer)
// ─────────────────────────────────────────────────────────────────────────────

function ThesisExpectation({ thesis }: { thesis: Thesis }) {
  const cfg = THESIS_STYLE[thesis.direction]
  return (
    <div className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} via-transparent to-transparent p-5`}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${cfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.accent}`} />
          <span className={`text-[11px] font-bold tracking-widest ${cfg.text}`}>SESGO {cfg.label}</span>
        </span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          Cross-asset {thesis.alignment_pct}% · Fractal {thesis.fractal_pct}%
        </span>
      </div>
      <p className={`text-base font-medium ${cfg.text} leading-relaxed`}>→ {thesis.expectation}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { data, loading, error, refetch } = useMacroData()
  const [tab, setTab] = useState<TabId>('fx')

  const lastUpdate = data
    ? (() => {
        const d = new Date(data.fecha)
        const et = d.toLocaleString('es-ES', {
          timeZone: 'America/New_York',
          day: '2-digit', month: 'short',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
        const ba = d.toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
        return { et, ba }
      })()
    : null

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-400/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Macro Alignment Engine
              </h1>
              <p className="text-xs text-slate-500">
                v1.0 · Macro × SMC alignment dashboard
                {lastUpdate && (
                  <span className="ml-2 text-slate-600 font-mono tabular-nums">
                    · {lastUpdate.et} <span className="text-slate-700">ET</span>
                    <span className="text-slate-700"> · </span>
                    <span className="text-sky-400/70">{lastUpdate.ba}</span> <span className="text-slate-700">BA</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 px-5 py-4 text-sm text-rose-300">
            <strong>Error de conexión:</strong> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-6 animate-pulse">
            <div className="h-14 rounded-2xl bg-white/[0.03]" />
            <div className="h-24 rounded-2xl bg-white/[0.03]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-72 rounded-2xl bg-white/[0.03]" />
              <div className="h-72 rounded-2xl bg-white/[0.03]" />
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Weekly timeline — always visible, NY time */}
            <section className="mb-8">
              <WeeklyTimeline events={data.upcoming_events ?? []} />
            </section>

            {/* Tab nav */}
            <nav className="flex gap-1.5 mb-8 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              {TABS.map(t => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-white/[0.08] border border-white/[0.12] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.label}</span>
                    <span className={`hidden lg:block text-[10px] font-normal ${active ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t.sub}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* ── TAB: FX ───────────────────────────────────────────────────── */}
            {tab === 'fx' && (
              <main className="space-y-8">
                <DxyContext data={data} />

                <section>
                  <SectionHeader title="Sesgo Operativo FX" subtitle="Fractalidad D/W/M · alineación con DXY" />
                  <FxBiasCards data={data} />
                </section>

                {data.thesis && (() => {
                  const fxRows = data.thesis.fractal_rows.filter(r =>
                    ['eurusd', 'gbpusd', 'dxy'].includes(r.key)
                  )
                  return fxRows.length > 0 ? (
                    <section>
                      <SectionHeader title="Fractalidad FX + DXY" subtitle="Alineación de marcos D × S × M" />
                      <FractalMatrix rows={fxRows} alignmentPct={data.thesis.fractal_pct} />
                    </section>
                  ) : null
                })()}

                {data.thesis && (
                  <section>
                    <SectionHeader title="Expectativa Operativa" subtitle="Derivada del análisis macro conjugado" />
                    <ThesisExpectation thesis={data.thesis} />
                  </section>
                )}
              </main>
            )}

            {/* ── TAB: Futuros & Macro ──────────────────────────────────────── */}
            {tab === 'futures' && (
              <main className="space-y-8">
                <section>
                  <MacroBanner data={data} />
                </section>

                <section>
                  <SectionHeader title="Futuros de Índices" subtitle="NQ · ES · alineación con régimen macro" />
                  <FuturesCards data={data} />
                </section>

                {data.thesis && (
                  <section>
                    <SectionHeader title="Trazabilidad entre Activos" subtitle="Confluencia de correlaciones · score 0–100" />
                    <ConfluenceScorecard thesis={data.thesis} />
                  </section>
                )}

                {data.thesis && (
                  <section>
                    <SectionHeader title="Fractalidad — D × S × M" subtitle="Alineación entre marcos temporales · base estructural del sesgo" />
                    <FractalMatrix rows={data.thesis.fractal_rows} alignmentPct={data.thesis.fractal_pct} />
                  </section>
                )}

                {data.thesis && (
                  <section>
                    <SectionHeader title="Tesis Macro Conjugada" subtitle="Técnico + fractal + fundamental implícito" />
                    <ThesisReport thesis={data.thesis} />
                  </section>
                )}
              </main>
            )}

            {/* ── TAB: Noticias ─────────────────────────────────────────────── */}
            {tab === 'news' && (
              <main className="space-y-8">
                <section>
                  <SectionHeader title="Sesiones & Operabilidad" subtitle="Semáforo en tiempo real · Londres y Nueva York · ET" />
                  <SessionMeter events={data.upcoming_events ?? []} />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <SectionHeader title="Titulares Recientes" subtitle="Clasificados por categoría macro" />
                    <NewsFeed news={data.news ?? []} regime={data.macro_regime} />
                  </div>
                  <div>
                    <SectionHeader title="Calendario Macro" subtitle="Todos los eventos calendarizados" />
                    <UpcomingCalendar events={data.upcoming_events ?? []} />
                  </div>
                </div>
              </main>
            )}
          </>
        )}

        <footer className="mt-16 pt-6 border-t border-white/[0.04] text-center text-[11px] text-slate-600">
          Macro Alignment Engine v1.0 · Solo para fines educativos. No constituye asesoramiento financiero.
        </footer>
      </div>
    </div>
  )
}
