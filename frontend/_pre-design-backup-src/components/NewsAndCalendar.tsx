import { useState, useMemo } from 'react'
import type { NewsItem, UpcomingEvent, NewsCategory, MacroRegime } from '../types/macro'
import {
  CATEGORY_LABEL, CATEGORY_STYLE, IMPORTANCE_STYLE,
  relativeTime, formatEventDate, daysFromNow, eventTimeNY, eventTimeBA,
  inferNewsBias,
} from '../lib/confluence'
import type { NewsBias } from '../lib/confluence'
import {
  Newspaper, CalendarDays, ExternalLink, Clock, ChevronDown,
  TrendingUp, TrendingDown, Target, AlertTriangle, Flame, Shield, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const BIAS_ICON: Record<NewsBias['icon'], LucideIcon> = {
  'alert':         AlertTriangle,
  'flame':         Flame,
  'trending-up':   TrendingUp,
  'trending-down': TrendingDown,
  'shield':        Shield,
  'zap':           Zap,
}

// ─────────────────────────────────────────────────────────────────────────────
// Event projection lookup — brief outlook per event type
// ─────────────────────────────────────────────────────────────────────────────

interface EventProjection {
  summary: string                  // what the event measures
  bullishScenario: string          // hawkish / hot / strong reading → outcome
  bearishScenario: string          // dovish / cold / weak reading → outcome
  tradingNote: string              // user-facing operational guidance
}

function getEventProjection(e: UpcomingEvent): EventProjection {
  const name = e.event.toLowerCase()
  const ccy  = e.currency

  if (name.includes('fomc') || name.includes('powell')) return {
    summary: `Decisión de política monetaria de la Fed + conferencia de Powell. Mayor catalizador del mes para el ${ccy}, rendimientos UST y todos los activos de riesgo.`,
    bullishScenario: `Tono hawkish (tasas altas más tiempo, dot plot agresivo) → ${ccy} fuerte, US10Y al alza, SPX/NDX bajistas, oro débil.`,
    bearishScenario: `Tono dovish (recortes acelerados, balance flexible) → ${ccy} débil, rendimientos abajo, risk-on en SPX/NDX, EUR/GBP fuertes vs ${ccy}.`,
    tradingNote: `Evitar operar 30min antes y 2h después. Esperar a que cierre la barra de 1H post-Powell para confirmar dirección.`,
  }
  if (name.includes('bce') || name.includes('ecb')) return {
    summary: `Decisión de tasas del Banco Central Europeo + conferencia de Lagarde. Define el sesgo del ${ccy} y la curva EU.`,
    bullishScenario: `Hawkish (subida o tono restrictivo sobre inflación de servicios) → ${ccy} fuerte, EUR/USD al alza, Bund yields suben.`,
    bearishScenario: `Dovish (recortes anticipados, crecimiento débil) → ${ccy} débil, EUR/USD a la baja, ventaja para DXY.`,
    tradingNote: `El movimiento real suele venir en la conferencia (≈45 min después de la decisión), no en el comunicado.`,
  }
  if (name.includes('boe')) return {
    summary: `Decisión de tasas del Banco de Inglaterra. Define el sesgo del ${ccy} y el spread con UST/Bunds.`,
    bullishScenario: `Hawkish (vote split a favor de subida, inflación de servicios pegajosa) → ${ccy} fuerte, GBP/USD al alza.`,
    bearishScenario: `Dovish (recortes anticipados, debilidad laboral) → ${ccy} débil, GBP/USD bajista.`,
    tradingNote: `Revisar el vote split (8-1, 7-2…) y la guía del BoE — son más movedores que la decisión en sí.`,
  }
  if (name.includes('nonfarm') || name.includes('nfp') || name.includes('payroll')) return {
    summary: `Nóminas no agrícolas EE.UU. Termómetro #1 del mercado laboral, mueve toda la curva UST y el ${ccy}.`,
    bullishScenario: `NFP > esperado + unemployment baja + wages al alza → ${ccy} fuerte, US10Y sube, SPX/NDX presionados.`,
    bearishScenario: `NFP < esperado + unemployment sube → expectativas de recortes Fed, ${ccy} débil, risk-on en NDX/SPX.`,
    tradingNote: `Volatilidad explosiva en los primeros 5 min (08:30 ET). Esperar 15-30 min para entrada limpia.`,
  }
  if (name.includes('cpi') || name.includes('inflación') || name.includes('pce')) return {
    summary: `Dato de inflación clave EE.UU. Define directamente las expectativas de tasas Fed.`,
    bullishScenario: `Lectura > esperado (inflación pegajosa) → Fed más hawkish, ${ccy} fuerte, rendimientos al alza, riesgo bajista.`,
    bearishScenario: `Lectura < esperado (desinflación) → expectativas de recortes, ${ccy} débil, risk-on en SPX/NDX/oro.`,
    tradingNote: `La sorpresa relativa al consenso es lo que mueve — no el número absoluto. Vigilar core vs headline.`,
  }
  if (name.includes('gdp') || name.includes('pib')) return {
    summary: `Producto Interno Bruto EE.UU. Mide la salud de la economía; afecta el outlook de tasas a mediano plazo.`,
    bullishScenario: `GDP > esperado → economía robusta, Fed con margen para tasas altas, ${ccy} fuerte.`,
    bearishScenario: `GDP < esperado → temores de recesión, expectativas de recortes, ${ccy} débil pero risk-off en equities.`,
    tradingNote: `Revisiones de trimestres previos suelen mover más que el dato actual. Mirar el deflactor de PCE incluido.`,
  }

  return {
    summary: `Evento macro relevante para ${ccy}. Puede generar volatilidad en pares y activos correlacionados.`,
    bullishScenario: `Lectura mejor que consenso → ${ccy} se fortalece contra sus cruces principales.`,
    bearishScenario: `Lectura peor que consenso → ${ccy} se debilita, oportunidad en cruces opuestos.`,
    tradingNote: `Esperar al menos 15 min post-publicación para confirmar dirección antes de entrar.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// News feed
// ─────────────────────────────────────────────────────────────────────────────

export function NewsFeed({ news, regime = 'MIXED' }: { news: NewsItem[]; regime?: MacroRegime }) {
  const [filter, setFilter] = useState<NewsCategory | 'all'>('all')

  // Dedupe by normalised title — protects against repeated headlines across tickers.
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    const out: NewsItem[] = []
    for (const n of news) {
      const k = n.title.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 140)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(n)
    }
    return out
  }, [news])

  // Build filter chips from categories actually present.
  const categoriesPresent = useMemo(() => {
    const counts = new Map<NewsCategory, number>()
    for (const n of deduped) counts.set(n.category, (counts.get(n.category) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [deduped])

  const visible = filter === 'all' ? deduped : deduped.filter(n => n.category === filter)

  if (deduped.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] p-8 text-center">
        <Newspaper className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Sin titulares recientes disponibles.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] overflow-hidden">
      {/* Filter chips */}
      {categoriesPresent.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-b border-white/[0.04] bg-white/[0.015]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              filter === 'all'
                ? 'bg-white/[0.10] text-white border-white/20'
                : 'bg-transparent text-slate-500 border-white/[0.08] hover:text-slate-300 hover:border-white/15'
            }`}
          >
            Todas · {deduped.length}
          </button>
          {categoriesPresent.map(([cat, n]) => {
            const style = CATEGORY_STYLE[cat]
            const active = filter === cat
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                  active
                    ? `${style.bg} ${style.text} ${style.border}`
                    : 'bg-transparent text-slate-500 border-white/[0.08] hover:text-slate-300 hover:border-white/15'
                }`}
              >
                {CATEGORY_LABEL[cat]} · {n}
              </button>
            )
          })}
        </div>
      )}

      <div className="divide-y divide-white/[0.04]">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Sin titulares en esta categoría.
          </div>
        ) : (
          visible.map((n, i) => {
            const cat   = CATEGORY_STYLE[n.category]
            const bias  = inferNewsBias(n.title, n.category, regime)
            const BIcon = BIAS_ICON[bias.icon]
            const isAlert = bias.tone !== 'neutral'
            return (
              <a
                key={i}
                href={n.link ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                title={`${bias.label} · click para abrir`}
                className={`group relative block p-4 pl-5 border-l-4 ${bias.edge} ${bias.rowTint} ${bias.glow} transition-all duration-200`}
              >
                {/* High-impact pulse strip on the left edge */}
                {(bias.tone === 'risk-off' || bias.tone === 'hawkish') && (
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${bias.edge.replace('border-l-', 'bg-')} opacity-60 animate-pulse pointer-events-none`} />
                )}

                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Bias alert badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${bias.badge} ${isAlert ? 'shadow-[0_0_10px_-4px_currentColor]' : ''}`}>
                      <BIcon className="w-3 h-3" />
                      {bias.label}
                    </span>
                    {/* Category tag — secondary */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${cat.bg} ${cat.text} ${cat.border} opacity-80`}>
                      {CATEGORY_LABEL[n.category]}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono shrink-0">
                    <Clock className="w-3 h-3" />
                    {relativeTime(n.published_at)}
                  </span>
                </div>

                <p className="text-sm font-semibold text-white leading-snug mb-1.5 group-hover:text-indigo-300 transition-colors">
                  {n.title}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{n.publisher}</span>
                  <span>·</span>
                  <span className="font-mono">{n.ticker}</span>
                  {n.link && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-500 group-hover:text-indigo-300 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">Abrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming calendar
// ─────────────────────────────────────────────────────────────────────────────

export function UpcomingCalendar({ events }: { events: UpcomingEvent[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] p-8 text-center">
        <CalendarDays className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Sin eventos próximos cargados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] divide-y divide-white/[0.04] overflow-hidden">
      {events.map((e, i) => {
        const days = daysFromNow(e.date)
        const imp  = IMPORTANCE_STYLE[e.importance]
        const open = openIdx === i
        const proj = getEventProjection(e)
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${open ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="w-14 shrink-0 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{days <= 0 ? 'HOY' : `${days}d`}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatEventDate(e.date).split(',')[1]?.trim() ?? ''}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    {e.currency}
                  </span>
                  {e.time_utc && (
                    <span
                      className="text-[10px] font-mono tabular-nums inline-flex items-center gap-1"
                      title={`${eventTimeNY(e.date, e.time_utc)} ET · ${eventTimeBA(e.date, e.time_utc)} BA`}
                    >
                      <span className="text-slate-400">{eventTimeNY(e.date, e.time_utc)}<span className="text-slate-600 ml-0.5">ET</span></span>
                      <span className="text-slate-700">/</span>
                      <span className="text-sky-300/80">{eventTimeBA(e.date, e.time_utc)}<span className="text-slate-600 ml-0.5">BA</span></span>
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white truncate">{e.event}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${imp.pill}`}>
                {imp.label}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="px-4 pb-5 pt-1 bg-white/[0.015] space-y-3">
                <p className="text-[12px] text-slate-300 leading-relaxed">{proj.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
                        Escenario alcista {e.currency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{proj.bullishScenario}</p>
                  </div>

                  <div className="rounded-lg bg-rose-500/[0.06] border border-rose-500/20 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[10px] font-bold tracking-widest text-rose-300 uppercase">
                        Escenario bajista {e.currency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{proj.bearishScenario}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/20 p-3">
                  <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase mb-1">Nota operativa</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{proj.tradingNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined section (side-by-side on desktop)
// ─────────────────────────────────────────────────────────────────────────────

export function NewsAndCalendar({
  news, events,
}: { news: NewsItem[]; events: UpcomingEvent[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <SectionLabel icon={Newspaper} title="Titulares Recientes" subtitle="Clasificados por categoría macro" />
        <NewsFeed news={news} />
      </div>
      <div>
        <SectionLabel icon={CalendarDays} title="Próximos Eventos Macro" subtitle="Catalizadores agendados" />
        <UpcomingCalendar events={events} />
      </div>
    </div>
  )
}

function SectionLabel({ icon: Icon, title, subtitle }: {
  icon: typeof Newspaper; title: string; subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}
