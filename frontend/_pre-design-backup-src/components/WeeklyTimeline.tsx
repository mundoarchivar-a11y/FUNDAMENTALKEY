import { useState, useEffect, useMemo } from 'react'
import type { UpcomingEvent } from '../types/macro'
import { IMPORTANCE_STYLE, eventTimeNY, eventTimeBA } from '../lib/confluence'
import { Clock, Flame, Zap } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Timeline — horizontal Sun→Sat strip of FX sessions in NY time.
// Sessions: Asia · London · New York. Each carries Killzones (high-vol windows).
// A glowing vertical "now" line sweeps across the week and a detailed 24h panel
// of today is shown underneath, with countdown to the next session/KZ change.
// All times are in ET (America/New_York) to mirror TradingView's clock.
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_ES        = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_ES_LONG   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TOTAL_HOURS    = 7 * 24 // 168

interface Session {
  id: 'asia' | 'london' | 'ny'
  label: string
  startEt: number
  durHr: number
  startDays: number[]   // day indices (0=Sun..6=Sat) where this session begins
  bandClass: string     // base band color
  pillClass: string     // legend pill
  accent: string        // bullet color for legend
}

interface KillZone {
  id: string
  parent: Session['id']
  label: string
  short: string
  startEt: number
  durHr: number
  startDays: number[]
  bandClass: string
  ringClass: string
}

// Asia = Sydney + Tokyo: 17:00 → 04:00 next day (Sun..Thu evenings).
// London FX: 02:00 → 12:00 ET (Mon..Fri). Includes London Open KZ at start.
// NY:        07:00 → 17:00 ET (Mon..Fri). Includes AM and PM killzones.
const SESSIONS: Session[] = [
  { id: 'asia',   label: 'Asia',       startEt: 17, durHr: 11, startDays: [0, 1, 2, 3, 4],
    bandClass: 'bg-violet-500/30', pillClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30', accent: 'bg-violet-400' },
  { id: 'london', label: 'Londres',    startEt: 2,  durHr: 10, startDays: [1, 2, 3, 4, 5],
    bandClass: 'bg-cyan-500/30',   pillClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',       accent: 'bg-cyan-400' },
  { id: 'ny',     label: 'Nueva York', startEt: 7,  durHr: 10, startDays: [1, 2, 3, 4, 5],
    bandClass: 'bg-amber-500/30',  pillClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',    accent: 'bg-amber-400' },
]

// Key hours surfaced as chips on the "today" panel (the structural moments of the trading day).
const KEY_HOURS: { h: number; short: string; full: string; tone: string }[] = [
  { h: 2,    short: 'LON KZ',   full: 'London Open Killzone', tone: 'text-cyan-200 border-cyan-400/50 bg-cyan-500/10' },
  { h: 5,    short: 'LON CONT', full: 'Cierre KZ · sigue Londres', tone: 'text-cyan-300/70 border-cyan-500/25 bg-cyan-500/5' },
  { h: 7,    short: 'NY AM KZ', full: 'NY AM Killzone',       tone: 'text-amber-200 border-amber-400/50 bg-amber-500/10' },
  { h: 9.5,  short: 'NYSE',     full: 'Apertura NYSE',        tone: 'text-emerald-200 border-emerald-400/50 bg-emerald-500/10' },
  { h: 13.5, short: 'NY PM KZ', full: 'NY PM Killzone',       tone: 'text-orange-200 border-orange-400/50 bg-orange-500/10' },
  { h: 16,   short: 'NYSE C',   full: 'Cierre NYSE',          tone: 'text-emerald-300/70 border-emerald-500/25 bg-emerald-500/5' },
  { h: 17,   short: 'FX CLOSE', full: 'Cierre FX NY',         tone: 'text-slate-200 border-slate-400/40 bg-slate-500/10' },
  { h: 20,   short: 'ASIA KZ',  full: 'Asia Killzone',        tone: 'text-violet-200 border-violet-400/50 bg-violet-500/10' },
]

// Estimated volatility windows per event impact (minutes pre / post release).
// Based on typical macro release behaviour: short pre-positioning + extended post-release move.
function eventWindow(imp: UpcomingEvent['importance']): { preMin: number; postMin: number } {
  if (imp === 'high')   return { preMin: 5,  postMin: 90 }
  if (imp === 'medium') return { preMin: 5,  postMin: 45 }
  return                     { preMin: 5,  postMin: 20 }
}

// Compact label for events (FOMC, NFP, CPI, etc.).
function eventAbbrev(name: string): string {
  const u = name.toUpperCase()
  const tags = ['FOMC', 'NFP', 'CPI', 'PCE', 'GDP', 'BCE', 'ECB', 'BOE', 'PMI', 'ISM', 'FED', 'BOJ']
  for (const t of tags) if (u.includes(t)) return t
  if (u.includes('NONFARM') || u.includes('PAYROLL')) return 'NFP'
  if (u.includes('TASAS') && u.includes('BCE')) return 'BCE'
  if (u.includes('TASAS')) return 'TASAS'
  return name.split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}

// ICT-style killzones, the high-volatility windows inside each session.
const KILLZONES: KillZone[] = [
  { id: 'asia-kz',   parent: 'asia',   label: 'Asia Killzone',       short: 'Asia KZ',
    startEt: 20,   durHr: 4,   startDays: [0, 1, 2, 3, 4],
    bandClass: 'bg-violet-400/85', ringClass: 'ring-violet-300/40' },
  { id: 'london-kz', parent: 'london', label: 'London Open Killzone', short: 'London KZ',
    startEt: 2,    durHr: 3,   startDays: [1, 2, 3, 4, 5],
    bandClass: 'bg-cyan-300/90',   ringClass: 'ring-cyan-200/40' },
  { id: 'ny-am-kz',  parent: 'ny',     label: 'NY AM Killzone',       short: 'NY AM KZ',
    startEt: 7,    durHr: 3,   startDays: [1, 2, 3, 4, 5],
    bandClass: 'bg-amber-300/90',  ringClass: 'ring-amber-200/40' },
  { id: 'ny-pm-kz',  parent: 'ny',     label: 'NY PM Killzone',       short: 'NY PM KZ',
    startEt: 13.5, durHr: 2.5, startDays: [1, 2, 3, 4, 5],
    bandClass: 'bg-orange-400/90', ringClass: 'ring-orange-300/40' },
]

// ─── Time helpers ────────────────────────────────────────────────────────────

interface NYNow {
  dayIdx: number
  hour: number
  minute: number
  second: number
  hourFrac: number
  globalHour: number
}

function getNYNow(date: Date): NYNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(date).map(p => [p.type, p.value]),
  )
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayIdx = map[parts.weekday as string] ?? 0
  const hourRaw = parseInt(parts.hour as string, 10)
  const hour    = hourRaw === 24 ? 0 : hourRaw
  const minute  = parseInt(parts.minute as string, 10)
  const second  = parseInt(parts.second as string, 10)
  const hourFrac = hour + minute / 60 + second / 3600
  return { dayIdx, hour, minute, second, hourFrac, globalHour: dayIdx * 24 + hourFrac }
}

function nyWeekStartISO(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(date).map(p => [p.type, p.value]),
  )
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayIdx = map[parts.weekday as string] ?? 0
  const base = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() - dayIdx)
  return base.toISOString().slice(0, 10)
}

function dayOffset(eventDate: string, weekStartISO: string): number {
  const a = new Date(weekStartISO + 'T00:00:00Z').getTime()
  const b = new Date(eventDate    + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86_400_000)
}

function fmtNYClock(date: Date, withSeconds = false): string {
  return date.toLocaleTimeString('es-ES', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  })
}

function fmtBAClock(date: Date, withSeconds = false): string {
  return date.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  })
}

function fmtETShort(date: Date): string {
  return date.toLocaleString('es-ES', {
    timeZone: 'America/New_York',
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function fmtBAShort(date: Date): string {
  return date.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function pad(n: number) { return n.toString().padStart(2, '0') }
function hourLabel(h: number) {
  const hi = Math.floor(h)
  const m  = Math.round((h - hi) * 60)
  return `${pad(hi)}:${pad(m)}`
}
function fmtMins(mins: number): string {
  if (mins < 1)  return '<1m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// Build flat list of every band (session base + killzone) across the week.
type Band = {
  key: string
  kind: 'session' | 'killzone'
  parent: Session['id']
  label: string
  short: string
  startGlobal: number  // hours from Sunday 00:00 ET
  endGlobal: number
}

function buildWeekBands(): Band[] {
  const out: Band[] = []
  for (const s of SESSIONS) {
    for (const d of s.startDays) {
      const start = d * 24 + s.startEt
      out.push({
        key: `s-${s.id}-${d}`, kind: 'session', parent: s.id,
        label: s.label, short: s.label, startGlobal: start, endGlobal: start + s.durHr,
      })
    }
  }
  for (const kz of KILLZONES) {
    for (const d of kz.startDays) {
      const start = d * 24 + kz.startEt
      out.push({
        key: `kz-${kz.id}-${d}`, kind: 'killzone', parent: kz.parent,
        label: kz.label, short: kz.short, startGlobal: start, endGlobal: start + kz.durHr,
      })
    }
  }
  return out
}

const WEEK_BANDS = buildWeekBands()

// What is active right now + next transition.
interface ActiveState {
  activeSessions: Session[]
  activeKZ: KillZone | null
  nextChange: { label: string; mins: number; kind: 'open' | 'close' } | null
}

function computeActive(nyNow: NYNow): ActiveState {
  const gh = nyNow.globalHour
  const activeSessions = SESSIONS.filter(s =>
    s.startDays.some(d => gh >= d * 24 + s.startEt && gh < d * 24 + s.startEt + s.durHr),
  )
  let activeKZ: KillZone | null = null
  for (const kz of KILLZONES) {
    if (kz.startDays.some(d => gh >= d * 24 + kz.startEt && gh < d * 24 + kz.startEt + kz.durHr)) {
      activeKZ = kz
      break
    }
  }

  // Collect every transition (open / close) of every session+killzone in the week,
  // pick the next one ahead. Wrap-around to next week if nothing left.
  const transitions: { at: number; label: string; kind: 'open' | 'close' }[] = []
  for (const s of SESSIONS) {
    for (const d of s.startDays) {
      transitions.push({ at: d * 24 + s.startEt,           label: s.label,        kind: 'open'  })
      transitions.push({ at: d * 24 + s.startEt + s.durHr, label: s.label,        kind: 'close' })
    }
  }
  for (const kz of KILLZONES) {
    for (const d of kz.startDays) {
      transitions.push({ at: d * 24 + kz.startEt,            label: kz.short, kind: 'open'  })
      transitions.push({ at: d * 24 + kz.startEt + kz.durHr, label: kz.short, kind: 'close' })
    }
  }
  transitions.sort((a, b) => a.at - b.at)
  let next = transitions.find(t => t.at > gh)
  if (!next && transitions.length) {
    // wrap to next week
    next = { ...transitions[0], at: transitions[0].at + TOTAL_HOURS }
  }
  const nextChange = next
    ? { label: next.label, mins: Math.round((next.at - gh) * 60), kind: next.kind }
    : null

  return { activeSessions, activeKZ, nextChange }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyTimeline({ events = [] }: { events?: UpcomingEvent[] }) {
  const [now, setNow] = useState(() => new Date())
  const [hoverWeek,  setHoverWeek]  = useState<number | null>(null)  // 0..168 global hour
  const [hoverToday, setHoverToday] = useState<number | null>(null)  // 0..24 hour of day

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const nyNow = useMemo(() => getNYNow(now), [now])
  const weekStart = useMemo(() => nyWeekStartISO(now), [now])
  const nowPctWeek = (nyNow.globalHour / TOTAL_HOURS) * 100
  const active = useMemo(() => computeActive(nyNow), [nyNow])
  const weekend = nyNow.dayIdx === 6 || (nyNow.dayIdx === 0 && nyNow.hourFrac < 17)

  // Anchor: UTC instant that corresponds to Sunday 00:00 ET this week.
  const sundayUTCms = now.getTime() - nyNow.globalHour * 3_600_000

  /** Translate a global-week hour (0..168) into a real Date in UTC. */
  function hourToDate(hourPos: number): Date {
    return new Date(sundayUTCms + hourPos * 3_600_000)
  }

  // ── Status badge ─────────────────────────────────────────────────────────
  const badge = (() => {
    if (weekend) return { tone: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: null,
      title: 'FIN DE SEMANA', sub: 'Mercados cerrados' }
    if (active.activeKZ) return { tone: 'text-rose-200 bg-rose-500/15 border-rose-400/40', icon: Flame,
      title: active.activeKZ.label.toUpperCase(), sub: 'Killzone activa · alta volatilidad' }
    if (active.activeSessions.length > 1) return { tone: 'text-indigo-300 bg-indigo-500/10 border-indigo-400/30', icon: Zap,
      title: 'OVERLAP', sub: active.activeSessions.map(s => s.label).join(' + ') }
    if (active.activeSessions.length === 1) return { tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: null,
      title: `${active.activeSessions[0].label.toUpperCase()} ACTIVA`, sub: 'Sesión en curso' }
    return { tone: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: null,
      title: 'FUERA DE SESIÓN', sub: 'Baja liquidez' }
  })()
  const BadgeIcon = badge.icon

  // ── Events on this week ──────────────────────────────────────────────────
  const weekEvents = events
    .map(e => {
      const off = dayOffset(e.date, weekStart)
      if (off < 0 || off > 6) return null
      let etHour = 12
      if (e.time_utc) {
        const nyTime = eventTimeNY(e.date, e.time_utc)
        if (nyTime) {
          const [h, m] = nyTime.split(':').map(n => parseInt(n, 10))
          etHour = h + m / 60
        }
      }
      const left = ((off * 24 + etHour) / TOTAL_HOURS) * 100
      return { e, left, off, etHour }
    })
    .filter((v): v is { e: UpcomingEvent; left: number; off: number; etHour: number } => v !== null)

  // ── Today's bands (for the zoom panel) ───────────────────────────────────
  const todayIdx = nyNow.dayIdx
  const todayBands = WEEK_BANDS
    .map(b => {
      // Clamp band to today's 0..24h window in global coords.
      const dayStart = todayIdx * 24
      const dayEnd   = dayStart + 24
      const s = Math.max(b.startGlobal, dayStart)
      const e = Math.min(b.endGlobal,   dayEnd)
      if (e <= s) return null
      return { ...b, dayStart: s - dayStart, dayEnd: e - dayStart }
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)

  const todayEvents = weekEvents.filter(we => we.off === todayIdx)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-sm p-5">
      {/* ── Header row: state + countdown + clock ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold tracking-wide ${badge.tone}`}>
          {BadgeIcon
            ? <BadgeIcon className="w-3.5 h-3.5" />
            : <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
          <span>{badge.title}</span>
          <span className="text-current/70 font-normal">· {badge.sub}</span>
        </span>

        {active.nextChange && !weekend && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-slate-300">
            <span className="text-slate-500">
              {active.nextChange.kind === 'open' ? 'Próxima apertura' : 'Cierre'}:
            </span>
            <span className="text-white">{active.nextChange.label}</span>
            <span className="text-emerald-400 font-mono tabular-nums">en {fmtMins(active.nextChange.mins)}</span>
          </span>
        )}

        <span className="ml-auto inline-flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white">{fmtNYClock(now, true)}</span>
            <span className="text-slate-500">ET</span>
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <span className="text-sky-300">{fmtBAClock(now, true)}</span>
            <span className="text-slate-500">BA</span>
          </span>
        </span>
      </div>

      {/* ── Weekly strip ─────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {/* Day labels */}
        <div className="grid grid-cols-7">
          {DAYS_ES.map((d, i) => {
            const isWeekendDay = i === 6 || i === 0
            const isToday = i === nyNow.dayIdx
            return (
              <div key={d} className={`text-center text-[10px] font-bold tracking-widest uppercase ${
                isToday ? 'text-white' : isWeekendDay ? 'text-slate-600' : 'text-slate-500'
              }`}>
                {d}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div
          className="relative rounded-lg bg-slate-950/70 border border-white/[0.05] overflow-hidden cursor-crosshair"
          onMouseMove={ev => {
            const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = (ev.clientX - rect.left) / rect.width
            setHoverWeek(Math.max(0, Math.min(TOTAL_HOURS - 0.0001, x * TOTAL_HOURS)))
          }}
          onMouseLeave={() => setHoverWeek(null)}
        >
          {/* Weekend tint */}
          <div className="absolute inset-y-0 left-0 bg-slate-950/80 pointer-events-none" style={{ width: `${100 / 7}%` }} />
          <div className="absolute inset-y-0 right-0 bg-slate-950/80 pointer-events-none" style={{ width: `${100 / 7}%` }} />

          {/* Day separators */}
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="absolute inset-y-0 w-px bg-white/[0.05] pointer-events-none z-10"
                 style={{ left: `${(i / 7) * 100}%` }} />
          ))}

          {/* Lanes */}
          <div className="relative grid grid-rows-3 divide-y divide-white/[0.04]">
            {SESSIONS.map(s => (
              <div key={s.id} className="relative h-9">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-[9px] font-bold tracking-widest uppercase text-slate-500 pointer-events-none">
                  {s.label}
                </span>
                {/* Base session bands */}
                {WEEK_BANDS.filter(b => b.kind === 'session' && b.parent === s.id).map(b => (
                  <div key={b.key}
                       className={`absolute h-3.5 rounded-sm ${s.bandClass}`}
                       style={{
                         left: `${(b.startGlobal / TOTAL_HOURS) * 100}%`,
                         width: `${((b.endGlobal - b.startGlobal) / TOTAL_HOURS) * 100}%`,
                         top: '50%', transform: 'translateY(-50%)',
                       }}
                       title={`${s.label} ${hourLabel(s.startEt)}–${hourLabel((s.startEt + s.durHr) % 24)} ET`} />
                ))}
                {/* Killzone overlays */}
                {KILLZONES.filter(kz => kz.parent === s.id).flatMap(kz =>
                  kz.startDays.map(d => {
                    const start = d * 24 + kz.startEt
                    const end   = start + kz.durHr
                    const isLive = nyNow.globalHour >= start && nyNow.globalHour < end
                    return (
                      <div key={`${kz.id}-${d}`}
                           className={`absolute h-3.5 rounded-sm ${kz.bandClass} ring-1 ${kz.ringClass} ${isLive ? 'animate-pulse' : ''}`}
                           style={{
                             left: `${(start / TOTAL_HOURS) * 100}%`,
                             width: `${(kz.durHr / TOTAL_HOURS) * 100}%`,
                             top: '50%', transform: 'translateY(-50%)',
                           }}
                           title={`${kz.label} ${hourLabel(kz.startEt)}–${hourLabel((kz.startEt + kz.durHr) % 24)} ET`} />
                    )
                  }),
                )}
              </div>
            ))}
          </div>

          {/* Event volatility windows (thin coloured bars spanning the full strip height) */}
          {weekEvents.map(({ e, off, etHour }, i) => {
            if (!e.time_utc) return null
            const w = eventWindow(e.importance)
            const startH = off * 24 + etHour - w.preMin / 60
            const endH   = off * 24 + etHour + w.postMin / 60
            const left  = (Math.max(0, startH) / TOTAL_HOURS) * 100
            const width = ((Math.min(TOTAL_HOURS, endH) - Math.max(0, startH)) / TOTAL_HOURS) * 100
            const fill = e.importance === 'high'
              ? 'bg-rose-500/25 border-rose-300/40'
              : e.importance === 'medium'
              ? 'bg-amber-500/20 border-amber-300/40'
              : 'bg-slate-500/15 border-slate-300/30'
            return (
              <div
                key={`win-${i}`}
                className={`absolute inset-y-0 ${fill} border-l border-r border-dashed pointer-events-none z-[6]`}
                style={{ left: `${left}%`, width: `${Math.max(0.35, width)}%` }}
                title={`${e.event} · ventana ±${w.preMin}/${w.postMin} min`}
              />
            )
          })}

          {/* Event markers (release time exact) */}
          {weekEvents.map(({ e, left }, i) => {
            const imp = IMPORTANCE_STYLE[e.importance]
            return (
              <div key={i}
                   className={`absolute -top-px w-2 h-2 rounded-full ${imp.dot} ring-1 ring-slate-950 pointer-events-none z-20 ${e.importance === 'high' ? 'animate-pulse' : ''}`}
                   style={{ left: `calc(${left}% - 4px)` }}
                   title={`${e.event} · ${e.date}${e.time_utc ? ` · ${eventTimeNY(e.date, e.time_utc)} ET / ${eventTimeBA(e.date, e.time_utc)} BA` : ''}`} />
            )
          })}

          {/* Hover guide line (week) */}
          {hoverWeek !== null && (
            <div
              className="absolute inset-y-0 w-px bg-sky-300/60 pointer-events-none z-20"
              style={{ left: `${(hoverWeek / TOTAL_HOURS) * 100}%` }}
            />
          )}

          {/* Now line + live chip */}
          {(() => {
            const tx = nowPctWeek < 8 ? '0%' : nowPctWeek > 92 ? '-100%' : '-50%'
            return (
              <div className="absolute inset-y-0 w-0.5 bg-emerald-400 pointer-events-none z-30 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]"
                   style={{ left: `calc(${nowPctWeek}% - 1px)` }}>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                <div className="absolute -top-7 z-40" style={{ left: 0, transform: `translateX(${tx})` }}>
                  <div className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-sm shadow-[0_0_8px_rgba(52,211,153,0.4)] whitespace-nowrap">
                    <span className="text-[10px] font-mono font-bold text-emerald-100 tabular-nums">{fmtNYClock(now, true)}</span>
                    <span className="text-[8px] text-emerald-300/70 ml-1">ET</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Hover tooltip (week strip) */}
          {hoverWeek !== null && (() => {
            const hoverDate = hourToDate(hoverWeek)
            const pct = (hoverWeek / TOTAL_HOURS) * 100
            const flip = pct > 75
            return (
              <div
                className="absolute -top-1 z-40 pointer-events-none"
                style={{
                  left: `${pct}%`,
                  transform: flip ? 'translate(calc(-100% - 8px), 0)' : 'translate(8px, 0)',
                }}
              >
                <ParallelTooltip date={hoverDate} />
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Today zoom panel ────────────────────────────────────────────── */}
      <TodayPanel
        todayIdx={todayIdx}
        nyNow={nyNow}
        nowDate={now}
        todayBands={todayBands}
        todayEvents={todayEvents}
        hover={hoverToday}
        onHover={setHoverToday}
        hourToDate={(h: number) => hourToDate(todayIdx * 24 + h)}
      />

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {SESSIONS.map(s => (
          <span key={s.id} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide ${s.pillClass}`}>
            <span className={`w-1.5 h-1.5 rounded-sm ${s.accent}`} />
            {s.label} {hourLabel(s.startEt)}–{hourLabel((s.startEt + s.durHr) % 24)} ET
          </span>
        ))}
        {KILLZONES.map(kz => (
          <span key={kz.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-300">
            <span className={`w-2 h-2 rounded-sm ${kz.bandClass}`} />
            {kz.short} {hourLabel(kz.startEt)}–{hourLabel((kz.startEt + kz.durHr) % 24)} ET
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold">
          <span className="w-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
          Ahora
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Today zoom panel — 24h horizontal bar with explicit hour ticks and labels.
// ─────────────────────────────────────────────────────────────────────────────

interface TodayPanelProps {
  todayIdx: number
  nyNow: NYNow
  nowDate: Date
  todayBands: { key: string; kind: 'session' | 'killzone'; parent: Session['id']; label: string; short: string; dayStart: number; dayEnd: number }[]
  todayEvents: { e: UpcomingEvent; etHour: number }[]
  hover: number | null
  onHover: (h: number | null) => void
  hourToDate: (h: number) => Date
}

function TodayPanel({ todayIdx, nyNow, nowDate, todayBands, todayEvents, hover, onHover, hourToDate }: TodayPanelProps) {
  const HOURS_PER_DAY = 24
  const nowPct = (nyNow.hourFrac / HOURS_PER_DAY) * 100
  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24]

  const sessionMeta = (id: Session['id']) => SESSIONS.find(s => s.id === id)!
  const killzoneMeta = (label: string) => KILLZONES.find(kz => kz.label === label)

  // Smart anchor for the now chip so it never overflows the panel edges.
  const nowChipTx = nowPct < 10 ? '0%' : nowPct > 90 ? '-100%' : '-50%'

  return (
    <div className="mt-5 pt-5 border-t border-white/[0.05]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Hoy</span>
          <span className="text-xs font-semibold text-white">{DAYS_ES_LONG[todayIdx]}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 tabular-nums">
          {pad(nyNow.hour)}:{pad(nyNow.minute)}:{pad(nyNow.second)} ET · {fmtBAClock(nowDate)} BA
        </span>
      </div>

      {/* Event labels (only if there are events today) */}
      {todayEvents.length > 0 && (
        <div className="relative h-6 mb-1">
          {todayEvents.map(({ e, etHour }, i) => {
            const left = (etHour / HOURS_PER_DAY) * 100
            const imp = IMPORTANCE_STYLE[e.importance]
            const tx = left < 10 ? '0%' : left > 90 ? '-100%' : '-50%'
            const w = eventWindow(e.importance)
            const baTime = e.time_utc ? eventTimeBA(e.date, e.time_utc) : null
            const etTime = e.time_utc ? eventTimeNY(e.date, e.time_utc) : null
            return (
              <div
                key={`evlbl-${i}`}
                className="absolute top-0"
                style={{ left: `${left}%`, transform: `translateX(${tx})` }}
              >
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${imp.pill}`}
                  title={`${e.event} · ${etTime ?? ''} ET / ${baTime ?? ''} BA · ventana ±${w.preMin}/${w.postMin} min`}
                >
                  <span className={`w-1 h-1 rounded-full ${imp.dot}`} />
                  {eventAbbrev(e.event)}
                  {etTime && <span className="text-slate-400/80 font-mono normal-case">{etTime}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Key hours chips */}
      <div className="relative h-5 mb-1">
        {KEY_HOURS.map(kh => {
          const left = (kh.h / HOURS_PER_DAY) * 100
          const tx = left < 6 ? '0%' : left > 94 ? '-100%' : '-50%'
          return (
            <div
              key={kh.h}
              className="absolute top-0"
              style={{ left: `${left}%`, transform: `translateX(${tx})` }}
              title={`${hourLabel(kh.h)} ET · ${kh.full}`}
            >
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border whitespace-nowrap ${kh.tone}`}>
                <span className="font-mono mr-1">{hourLabel(kh.h)}</span>
                {kh.short}
              </span>
            </div>
          )
        })}
      </div>

      {/* Hour scale */}
      <div className="relative h-3 mb-1">
        {hourTicks.map(h => (
          <div key={h} className="absolute -translate-x-1/2 text-[9px] font-mono text-slate-600 tabular-nums"
               style={{ left: `${(h / HOURS_PER_DAY) * 100}%` }}>
            {pad(h % 24)}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        className="relative rounded-lg bg-slate-950/70 border border-white/[0.06] overflow-hidden cursor-crosshair"
        onMouseMove={ev => {
          const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect()
          const x = (ev.clientX - rect.left) / rect.width
          onHover(Math.max(0, Math.min(HOURS_PER_DAY - 0.0001, x * HOURS_PER_DAY)))
        }}
        onMouseLeave={() => onHover(null)}
      >
        {/* Hour gridlines */}
        {hourTicks.slice(1, -1).map(h => (
          <div key={h} className="absolute inset-y-0 w-px bg-white/[0.04] pointer-events-none"
               style={{ left: `${(h / HOURS_PER_DAY) * 100}%` }} />
        ))}

        {/* Key-hour dashed vertical guides */}
        {KEY_HOURS.map(kh => (
          <div
            key={`kh-${kh.h}`}
            className="absolute inset-y-0 pointer-events-none z-[5]"
            style={{
              left: `${(kh.h / HOURS_PER_DAY) * 100}%`,
              width: '1px',
              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.22) 0 3px, transparent 3px 6px)',
            }}
          />
        ))}

        {/* Event volatility windows (full-height translucent rectangles) */}
        {todayEvents.map(({ e, etHour }, i) => {
          if (!e.time_utc) return null
          const w = eventWindow(e.importance)
          const startH = Math.max(0, etHour - w.preMin / 60)
          const endH   = Math.min(HOURS_PER_DAY, etHour + w.postMin / 60)
          const left   = (startH / HOURS_PER_DAY) * 100
          const width  = ((endH - startH) / HOURS_PER_DAY) * 100
          const fill = e.importance === 'high'
            ? 'bg-rose-500/[0.12] border-rose-300/50'
            : e.importance === 'medium'
            ? 'bg-amber-500/[0.10] border-amber-300/50'
            : 'bg-slate-500/[0.08] border-slate-300/30'
          return (
            <div
              key={`win-${i}`}
              className={`absolute inset-y-0 ${fill} border-l border-r border-dashed pointer-events-none z-[6]`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${e.event} · ventana de volatilidad ±${w.preMin}/${w.postMin} min`}
            />
          )
        })}

        {/* Event release exact line */}
        {todayEvents.map(({ e, etHour }, i) => {
          if (!e.time_utc) return null
          const color = e.importance === 'high'
            ? 'bg-rose-400'
            : e.importance === 'medium'
            ? 'bg-amber-400'
            : 'bg-slate-400'
          return (
            <div
              key={`rel-${i}`}
              className={`absolute inset-y-0 w-px ${color} pointer-events-none z-[7] shadow-[0_0_6px_currentColor] opacity-90`}
              style={{ left: `${(etHour / HOURS_PER_DAY) * 100}%` }}
            />
          )
        })}

        <div className="relative grid grid-rows-3 divide-y divide-white/[0.04]">
          {SESSIONS.map(s => {
            const sessionBands = todayBands.filter(b => b.parent === s.id && b.kind === 'session')
            const kzBands      = todayBands.filter(b => b.parent === s.id && b.kind === 'killzone')
            return (
              <div key={s.id} className="relative h-10 flex items-center">
                <span className="absolute left-2 z-10 text-[9px] font-bold tracking-widest uppercase text-slate-500 pointer-events-none">
                  {s.label}
                </span>
                {/* Session base */}
                {sessionBands.map(b => (
                  <div key={b.key}
                       className={`absolute h-5 rounded ${sessionMeta(b.parent).bandClass}`}
                       style={{
                         left: `${(b.dayStart / HOURS_PER_DAY) * 100}%`,
                         width: `${((b.dayEnd - b.dayStart) / HOURS_PER_DAY) * 100}%`,
                         top: '50%', transform: 'translateY(-50%)',
                       }} />
                ))}
                {/* Killzones with label */}
                {kzBands.map(b => {
                  const kz = killzoneMeta(b.label)
                  if (!kz) return null
                  const isLive = nyNow.hourFrac >= b.dayStart && nyNow.hourFrac < b.dayEnd
                  const widthPct = ((b.dayEnd - b.dayStart) / HOURS_PER_DAY) * 100
                  return (
                    <div key={b.key}
                         className={`absolute h-5 rounded ${kz.bandClass} ring-1 ${kz.ringClass} flex items-center justify-center overflow-hidden ${isLive ? 'animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.4)]' : ''}`}
                         style={{
                           left: `${(b.dayStart / HOURS_PER_DAY) * 100}%`,
                           width: `${widthPct}%`,
                           top: '50%', transform: 'translateY(-50%)',
                         }}
                         title={`${b.label} ${hourLabel(kz.startEt)}–${hourLabel((kz.startEt + kz.durHr) % 24)} ET`}>
                      {widthPct > 6 && (
                        <span className="text-[9px] font-bold tracking-wider text-slate-900 px-1 truncate">
                          {b.short}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Today's events */}
        {todayEvents.map(({ e, etHour }, i) => {
          const left = (etHour / HOURS_PER_DAY) * 100
          const imp  = IMPORTANCE_STYLE[e.importance]
          return (
            <div key={i}
                 className={`absolute -top-px w-2 h-2 rounded-full ${imp.dot} ring-1 ring-slate-950 pointer-events-none z-20`}
                 style={{ left: `calc(${left}% - 4px)` }}
                 title={`${e.event}${e.time_utc ? ` · ${eventTimeNY(e.date, e.time_utc)} ET / ${eventTimeBA(e.date, e.time_utc)} BA` : ''}`} />
          )
        })}

        {/* Hover guide (today) */}
        {hover !== null && (
          <div
            className="absolute inset-y-0 w-px bg-sky-300/60 pointer-events-none z-20"
            style={{ left: `${(hover / HOURS_PER_DAY) * 100}%` }}
          />
        )}

        {/* Now line + live ET/BA chip */}
        <div className="absolute inset-y-0 w-0.5 bg-emerald-400 pointer-events-none z-30 shadow-[0_0_12px_3px_rgba(52,211,153,0.7)]"
             style={{ left: `calc(${nowPct}% - 1px)` }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" />
          <div className="absolute -bottom-10 z-40" style={{ left: 0, transform: `translateX(${nowChipTx})` }}>
            <div className="rounded-md bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-sm shadow-[0_0_12px_rgba(52,211,153,0.45)] px-2 py-1 whitespace-nowrap">
              <div className="flex items-center gap-1.5 font-mono tabular-nums leading-none">
                <span className="text-[10px] font-bold text-emerald-100">{pad(nyNow.hour)}:{pad(nyNow.minute)}:{pad(nyNow.second)}</span>
                <span className="text-[8px] text-emerald-300/70">ET</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono tabular-nums leading-none mt-0.5">
                <span className="text-[10px] font-bold text-sky-200">{fmtBAClock(nowDate, true)}</span>
                <span className="text-[8px] text-sky-300/70">BA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover tooltip (today) */}
        {hover !== null && (() => {
          const hoverDate = hourToDate(hover)
          const pct = (hover / HOURS_PER_DAY) * 100
          const flip = pct > 70
          return (
            <div
              className="absolute -top-1 z-40 pointer-events-none"
              style={{
                left: `${pct}%`,
                transform: flip ? 'translate(calc(-100% - 8px), 0)' : 'translate(8px, 0)',
              }}
            >
              <ParallelTooltip date={hoverDate} />
            </div>
          )
        })()}
      </div>

      {/* Spacer for the now-chip below the bar */}
      <div className="h-12" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover tooltip — paralelismo ET / Buenos Aires
// ─────────────────────────────────────────────────────────────────────────────

function ParallelTooltip({ date }: { date: Date }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-2xl shadow-black/50 px-3 py-2 min-w-[140px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3 h-3 text-slate-500" />
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-500">Paralelismo</span>
      </div>
      <div className="space-y-1 font-mono tabular-nums text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 text-[9px] font-bold tracking-widest">ET</span>
          <span className="text-white capitalize">{fmtETShort(date)}</span>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sky-400 text-[9px] font-bold tracking-widest">BA</span>
          <span className="text-sky-200 capitalize">{fmtBAShort(date)}</span>
        </div>
      </div>
    </div>
  )
}
