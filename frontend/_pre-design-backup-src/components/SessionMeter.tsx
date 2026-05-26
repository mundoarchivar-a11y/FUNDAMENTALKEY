import { useState, useEffect } from 'react'
import type { UpcomingEvent, EventImportance } from '../types/macro'
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

// ─── Session windows (UTC, fractional hours) ────────────────────────────────
const LONDON = { open: 8, close: 17 }       // 08:00–17:00 UTC
const NY     = { open: 13.5, close: 21 }    // 13:30–21:00 UTC

// ─── Helpers ─────────────────────────────────────────────────────────────────

function utcFrac(d: Date) {
  return d.getUTCHours() + d.getUTCMinutes() / 60
}

function isWeekend(d: Date) {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

function minsUntil(targetFrac: number, nowFrac: number): number {
  let diff = (targetFrac - nowFrac) * 60
  if (diff < 0) diff += 24 * 60
  return Math.round(diff)
}

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Returns the UTC datetime of an event (combines date + time_utc). */
function eventDateTime(e: UpcomingEvent): Date | null {
  if (!e.time_utc) return null
  return new Date(`${e.date}T${e.time_utc}:00Z`)
}

/** Minutes from now to event start (negative = event already passed). */
function minsToEvent(e: UpcomingEvent, now: Date): number | null {
  const dt = eventDateTime(e)
  if (!dt) return null
  return Math.round((dt.getTime() - now.getTime()) / 60_000)
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  name: string
  active: boolean
  weekend: boolean
  minsToChange: number
  impactLevel: EventImportance | 'none'
  nextEvent: UpcomingEvent | null
  nextEventMins: number | null
}

function SessionCard({
  name, active, weekend, minsToChange, impactLevel, nextEvent, nextEventMins,
}: SessionCardProps) {
  const stateColor = weekend
    ? 'text-slate-500'
    : active
    ? 'text-emerald-400'
    : 'text-slate-500'

  const dotColor = weekend
    ? 'bg-slate-600'
    : active
    ? 'bg-emerald-500'
    : 'bg-slate-700'

  const borderColor =
    !active || weekend               ? 'border-white/[0.06]' :
    impactLevel === 'high'           ? 'border-rose-500/30'  :
    impactLevel === 'medium'         ? 'border-amber-500/30' :
                                       'border-emerald-500/20'

  const bgColor =
    !active || weekend               ? 'bg-white/[0.02]'      :
    impactLevel === 'high'           ? 'bg-rose-500/5'        :
    impactLevel === 'medium'         ? 'bg-amber-500/5'       :
                                       'bg-emerald-500/5'

  return (
    <div className={`flex-1 rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor} ${active && !weekend ? 'shadow-[0_0_6px]' : ''} ${active && !weekend && impactLevel === 'none' ? 'shadow-emerald-500/60' : ''}`} />
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">{name}</span>
        <span className={`ml-auto text-[10px] font-bold tracking-wide ${stateColor}`}>
          {weekend ? 'FIN DE SEMANA' : active ? 'ACTIVA' : 'CERRADA'}
        </span>
      </div>

      {!weekend && (
        <p className="text-xs text-slate-500 mb-3">
          {active
            ? `Cierra en ${fmtMins(minsToChange)}`
            : `Abre en ${fmtMins(minsToChange)}`}
        </p>
      )}

      {/* Impact status for this session */}
      {active && !weekend && (
        <div className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${
          impactLevel === 'high'   ? 'bg-rose-500/15 text-rose-300'   :
          impactLevel === 'medium' ? 'bg-amber-500/15 text-amber-300' :
                                     'bg-emerald-500/10 text-emerald-400'
        }`}>
          {impactLevel === 'high' && nextEvent && nextEventMins !== null && nextEventMins >= 0
            ? `🔴 ${nextEvent.event.split(' ').slice(0, 3).join(' ')} en ${fmtMins(nextEventMins)}`
            : impactLevel === 'high'
            ? '🔴 Evento de alto impacto hoy'
            : impactLevel === 'medium'
            ? '🟡 Evento de impacto medio hoy'
            : '🟢 Sin eventos de alto impacto'}
        </div>
      )}

      {!active && !weekend && nextEvent && (
        <p className="text-[11px] text-slate-600">
          Próximo: <span className="text-slate-400">{nextEvent.event.split(' ').slice(0, 3).join(' ')}</span>
        </p>
      )}
    </div>
  )
}

// ─── Main semáforo ────────────────────────────────────────────────────────────

type TradeSignal = 'clear' | 'caution' | 'avoid'

interface SemaphoreConfig {
  signal: TradeSignal
  color: string
  bg: string
  border: string
  icon: typeof CheckCircle2
  title: string
  sub: string
}

function getSemaphoreConfig(
  londonActive: boolean,
  nyActive: boolean,
  weekend: boolean,
  nextHighMins: number | null,
  nextMedMins: number | null,
): SemaphoreConfig {
  // Outside sessions
  if (weekend) {
    return {
      signal: 'clear', color: 'text-slate-400', bg: 'bg-slate-500/10',
      border: 'border-slate-500/20', icon: CheckCircle2,
      title: 'Mercados cerrados',
      sub: 'Fin de semana — sin sesiones activas',
    }
  }

  if (!londonActive && !nyActive) {
    return {
      signal: 'clear', color: 'text-slate-400', bg: 'bg-slate-500/10',
      border: 'border-slate-500/20', icon: CheckCircle2,
      title: 'Fuera de sesión',
      sub: 'Ni Londres ni Nueva York están activas — baja liquidez',
    }
  }

  // High impact event within 2 hours or just passed (< 30 min ago)
  if (nextHighMins !== null && nextHighMins >= -30 && nextHighMins <= 120) {
    const tag = nextHighMins < 0
      ? `Evento en curso (hace ${fmtMins(-nextHighMins)})`
      : nextHighMins < 1
      ? 'Evento AHORA'
      : `Evento en ${fmtMins(nextHighMins)}`
    return {
      signal: 'avoid', color: 'text-rose-300', bg: 'bg-rose-500/10',
      border: 'border-rose-500/30', icon: ShieldAlert,
      title: 'CARPETA ROJA — Evitar operaciones',
      sub: tag,
    }
  }

  // Medium impact within 1 hour, or high impact today in active session (no precise time)
  if ((nextMedMins !== null && nextMedMins >= 0 && nextMedMins <= 60) ||
      (nextHighMins !== null && nextHighMins > 120 && nextHighMins <= 240)) {
    const tag = nextHighMins !== null && nextHighMins > 120
      ? `Evento de alto impacto en ${fmtMins(nextHighMins)}`
      : nextMedMins !== null
      ? `Evento de impacto medio en ${fmtMins(nextMedMins)}`
      : ''
    return {
      signal: 'caution', color: 'text-amber-300', bg: 'bg-amber-500/10',
      border: 'border-amber-500/30', icon: AlertTriangle,
      title: 'PRECAUCIÓN',
      sub: tag || 'Evento próximo en la sesión activa',
    }
  }

  return {
    signal: 'clear', color: 'text-emerald-300', bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20', icon: CheckCircle2,
    title: 'VENTANA LIMPIA',
    sub: londonActive && nyActive
      ? 'Overlap Londres–NY · sin eventos de alto impacto inmediatos'
      : londonActive
      ? 'Sesión Londres activa · sin eventos de alto impacto'
      : 'Sesión Nueva York activa · sin eventos de alto impacto',
  }
}

// ─── Exported component ───────────────────────────────────────────────────────

export function SessionMeter({ events }: { events: UpcomingEvent[] }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const frac    = utcFrac(now)
  const weekend = isWeekend(now)
  const londonActive = !weekend && frac >= LONDON.open && frac < LONDON.close
  const nyActive     = !weekend && frac >= NY.open && frac < NY.close

  const minsLondonChange = londonActive
    ? minsUntil(LONDON.close, frac)
    : minsUntil(LONDON.open, frac)
  const minsNyChange = nyActive
    ? minsUntil(NY.close, frac)
    : minsUntil(NY.open, frac)

  // Upcoming events with timing
  const upcoming = events
    .map(e => ({ e, mins: minsToEvent(e, now) }))
    .filter(({ mins }) => mins === null || mins > -60) // exclude events > 1h ago
    .sort((a, b) => {
      const am = a.mins ?? Infinity
      const bm = b.mins ?? Infinity
      return am - bm
    })

  // Find next high / medium impact events with known times
  const nextHigh   = upcoming.find(({ e }) => e.importance === 'high')
  const nextMed    = upcoming.find(({ e }) => e.importance === 'medium')
  const nextHighMins = nextHigh?.mins ?? null
  const nextMedMins  = nextMed?.mins ?? null

  // Session-level impact (events today during each session)
  // "Today" as seen in New York (matches the user's TradingView clock)
  const todayStr = (() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now)
    return parts // en-CA gives "YYYY-MM-DD"
  })()
  const todayEvents = events.filter(e => e.date === todayStr)

  const londonImpact = (): EventImportance | 'none' => {
    if (!londonActive) return 'none'
    const inLondon = todayEvents.filter(e =>
      !e.session || e.session === 'london' || e.session === 'overlap'
    )
    if (inLondon.some(e => e.importance === 'high')) return 'high'
    if (inLondon.some(e => e.importance === 'medium')) return 'medium'
    return 'none'
  }

  const nyImpact = (): EventImportance | 'none' => {
    if (!nyActive) return 'none'
    const inNy = todayEvents.filter(e =>
      !e.session || e.session === 'ny' || e.session === 'overlap'
    )
    if (inNy.some(e => e.importance === 'high')) return 'high'
    if (inNy.some(e => e.importance === 'medium')) return 'medium'
    return 'none'
  }

  const cfg = getSemaphoreConfig(londonActive, nyActive, weekend, nextHighMins, nextMedMins)
  const SemIcon = cfg.icon

  const nyString = now.toLocaleTimeString('es-ES', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const baString = now.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div className="space-y-4">
      {/* Semáforo principal */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl border ${cfg.border} flex items-center justify-center shrink-0`}>
            <SemIcon className={`w-7 h-7 ${cfg.color}`} />
          </div>
          <div className="flex-1">
            <p className={`text-xl font-black tracking-tight ${cfg.color}`}>{cfg.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{cfg.sub}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono shrink-0 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-300">{nyString}<span className="text-slate-500 ml-1">ET</span></span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-sky-200">{baString}<span className="text-slate-500 ml-1">BA</span></span>
          </div>
        </div>
      </div>

      {/* Session cards */}
      <div className="flex gap-3">
        <SessionCard
          name="Londres"
          active={londonActive}
          weekend={weekend}
          minsToChange={minsLondonChange}
          impactLevel={londonImpact()}
          nextEvent={nextHigh?.e ?? null}
          nextEventMins={nextHighMins}
        />
        <SessionCard
          name="Nueva York"
          active={nyActive}
          weekend={weekend}
          minsToChange={minsNyChange}
          impactLevel={nyImpact()}
          nextEvent={nextHigh?.e ?? null}
          nextEventMins={nextHighMins}
        />
      </div>

      {/* Overlap badge */}
      {londonActive && nyActive && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-indigo-300">
            Overlap Londres–Nueva York activo · máxima liquidez y volatilidad
          </p>
        </div>
      )}
    </div>
  )
}
