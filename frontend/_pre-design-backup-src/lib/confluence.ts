/**
 * Confluence — view-layer helpers ONLY.
 * ─────────────────────────────────────────────────────────────────────────────
 * All scoring, vector building, evidence and expectation generation lives in
 * Python (confluence.py).  This file is reduced to render-side formatters
 * and shared lookups.
 */

import type {
  NewsCategory, ThesisDirection, VectorStatus, EventImportance, FractalUnit, Trend, MacroRegime,
} from '../types/macro'

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

export const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
export const fmtBps = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} bps`
export const fmtPts = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)} pts`

export function fmtDelta(value: number, unit: FractalUnit): string {
  if (unit === 'bps') return fmtBps(value)
  if (unit === 'pts') return fmtPts(value)
  return fmtPct(value)
}

export function fmtLevel(value: number, key: string): string {
  if (key === 'eurusd' || key === 'gbpusd') return value.toFixed(5)
  if (key === 'us10y' || key === 'us02y')   return `${value.toFixed(2)}%`
  return value.toFixed(2)
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffSec = (Date.now() - t) / 1000
  if (diffSec < 60)        return 'ahora'
  if (diffSec < 3600)      return `${Math.floor(diffSec / 60)}m`
  if (diffSec < 86400)     return `${Math.floor(diffSec / 3600)}h`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', weekday: 'short' })
}

const NY_TZ = 'America/New_York'
const BA_TZ = 'America/Argentina/Buenos_Aires'

/** Format a UTC ISO timestamp as New York local time (matches TradingView "New York" TZ). */
export function formatDateTimeNY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    timeZone: NY_TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Format a UTC ISO timestamp as just HH:MM in New York time. */
export function formatTimeNY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-ES', {
    timeZone: NY_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Combine event date (YYYY-MM-DD) + UTC time (HH:MM) and return HH:MM in NY. */
export function eventTimeNY(date: string, timeUtc?: string): string | null {
  if (!timeUtc) return null
  const d = new Date(`${date}T${timeUtc}:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-ES', {
    timeZone: NY_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Same as eventTimeNY but for Buenos Aires (ART, UTC-3, no DST). */
export function eventTimeBA(date: string, timeUtc?: string): string | null {
  if (!timeUtc) return null
  const d = new Date(`${date}T${timeUtc}:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-AR', {
    timeZone: BA_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Format a Date or ISO as HH:MM in Buenos Aires time. */
export function formatTimeBA(input: Date | string | null | undefined): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-AR', {
    timeZone: BA_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Format a Date as full day+time in Buenos Aires, useful for tooltips. */
export function formatDateTimeBA(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    timeZone: BA_TZ, weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function daysFromNow(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z')
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone helpers
// ─────────────────────────────────────────────────────────────────────────────

export function deltaTone(v: number, threshold = 0.01, invert = false): string {
  if (Math.abs(v) < threshold) return 'text-slate-400'
  const positive = invert ? v < 0 : v > 0
  return positive ? 'text-emerald-400' : 'text-rose-400'
}

export function trendTone(t: Trend): string {
  if (t === 'UP')   return 'text-emerald-400'
  if (t === 'DOWN') return 'text-rose-400'
  return 'text-slate-500'
}

// ─────────────────────────────────────────────────────────────────────────────
// Static lookup tables
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  monetary:    'política monetaria',
  inflation:   'inflación',
  labor:       'mercado laboral',
  growth:      'crecimiento',
  geopolitics: 'geopolítica',
  general:     'general',
}

export const CATEGORY_STYLE: Record<NewsCategory, { bg: string; text: string; border: string }> = {
  monetary:    { bg: 'bg-indigo-500/10',  text: 'text-indigo-300',  border: 'border-indigo-500/20'  },
  inflation:   { bg: 'bg-rose-500/10',    text: 'text-rose-300',    border: 'border-rose-500/20'    },
  labor:       { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/20'   },
  growth:      { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  geopolitics: { bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/20'  },
  general:     { bg: 'bg-slate-500/10',   text: 'text-slate-300',   border: 'border-slate-500/20'   },
}

export const IMPORTANCE_STYLE: Record<EventImportance, { dot: string; pill: string; label: string }> = {
  high:   { dot: 'bg-rose-500',  pill: 'bg-rose-500/10 text-rose-300 border-rose-500/30',     label: 'Alta'  },
  medium: { dot: 'bg-amber-400', pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30',  label: 'Media' },
  low:    { dot: 'bg-slate-500', pill: 'bg-slate-500/10 text-slate-300 border-slate-500/30',  label: 'Baja'  },
}

export const VECTOR_STATUS_STYLE: Record<VectorStatus, { text: string; bg: string; border: string; label: string }> = {
  CONFIRMS: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'CONFIRMA' },
  DIVERGES: { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    label: 'DIVERGE'  },
  NEUTRAL:  { text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   label: 'NEUTRO'   },
}

export const THESIS_STYLE: Record<ThesisDirection, {
  label: string; text: string; bg: string; border: string; accent: string;
}> = {
  BEARISH_RISK:  { label: 'BAJISTA',       text: 'text-rose-300',    bg: 'from-rose-950/30',    border: 'border-rose-500/20',    accent: 'bg-rose-500'    },
  BULLISH_RISK:  { label: 'ALCISTA',       text: 'text-emerald-300', bg: 'from-emerald-950/30', border: 'border-emerald-500/20', accent: 'bg-emerald-500' },
  CONSOLIDATION: { label: 'CONSOLIDACIÓN', text: 'text-amber-300',   bg: 'from-amber-950/30',   border: 'border-amber-500/20',   accent: 'bg-amber-500'   },
}

// ─────────────────────────────────────────────────────────────────────────────
// News bias inference — keyword + category + macro-regime heuristics.
// Returns a directional signal so each headline gets a colour-coded alert.
// ─────────────────────────────────────────────────────────────────────────────

export type NewsBiasTone =
  | 'risk-off'      // bearish equities / USD-strong
  | 'risk-on'       // bullish equities / USD-weak
  | 'hawkish'       // Fed hawkish / yields up / USD strong
  | 'dovish'        // Fed dovish / yields down / USD weak
  | 'high-impact'   // categorical hot data (CPI/NFP) without clear keyword tilt
  | 'neutral'

export interface NewsBias {
  tone:     NewsBiasTone
  label:    string
  /** Tailwind border-l-* class, used as the alert left edge. */
  edge:     string
  /** Hover glow class. */
  glow:     string
  /** Inline pill bg/text/border classes. */
  badge:    string
  /** Subtle background tint applied to the whole row. */
  rowTint:  string
  /** Lucide icon name to render. Resolved in the component. */
  icon:     'alert' | 'flame' | 'trending-down' | 'trending-up' | 'shield' | 'zap'
}

const HAWKISH_KW  = ['hawkish', 'hot', 'beat', 'beats', 'strong', 'rate hike', 'tighten', 'tightening', 'restrictive', 'sticky', 'higher for longer', 'jumbo']
const DOVISH_KW   = ['dovish', 'cool', 'miss', 'misses', 'weak', 'rate cut', 'cuts', 'easing', 'ease', 'stimulus', 'accommodative', 'soft landing']
const RISK_OFF_KW = ['war', 'tension', 'tensions', 'conflict', 'tariff', 'tariffs', 'sanction', 'sanctions', 'crisis', 'crash', 'recession', 'default', 'escalation', 'attack', 'invasion', 'sell-off', 'plunge']
const RISK_ON_KW  = ['rally', 'surge', 'recovery', 'breakthrough', 'agreement', 'truce', 'ceasefire', 'all-time high', 'record high']

export function inferNewsBias(title: string, category: NewsCategory, regime: MacroRegime): NewsBias {
  const t = title.toLowerCase()
  const has = (kws: string[]) => kws.some(k => t.includes(k))

  // Geopolitics or explicit risk-off language → red alert
  if (category === 'geopolitics' || has(RISK_OFF_KW)) {
    return {
      tone: 'risk-off', label: 'RISK-OFF',
      edge:  'border-l-rose-500',
      glow:  'group-hover:shadow-[0_0_28px_-6px_rgba(244,63,94,0.55)]',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      rowTint: 'hover:bg-rose-500/[0.04]',
      icon:  'alert',
    }
  }

  // Explicit risk-on language → green
  if (has(RISK_ON_KW)) {
    return {
      tone: 'risk-on', label: 'RISK-ON',
      edge:  'border-l-emerald-500',
      glow:  'group-hover:shadow-[0_0_28px_-6px_rgba(52,211,153,0.55)]',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      rowTint: 'hover:bg-emerald-500/[0.04]',
      icon:  'trending-up',
    }
  }

  // Hawkish language → amber / USD-strong
  if (has(HAWKISH_KW)) {
    return {
      tone: 'hawkish', label: 'HAWKISH',
      edge:  'border-l-amber-500',
      glow:  'group-hover:shadow-[0_0_28px_-6px_rgba(251,191,36,0.55)]',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      rowTint: 'hover:bg-amber-500/[0.04]',
      icon:  'flame',
    }
  }

  // Dovish language → sky / USD-weak
  if (has(DOVISH_KW)) {
    return {
      tone: 'dovish', label: 'DOVISH',
      edge:  'border-l-sky-500',
      glow:  'group-hover:shadow-[0_0_28px_-6px_rgba(56,189,248,0.55)]',
      badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
      rowTint: 'hover:bg-sky-500/[0.04]',
      icon:  'trending-down',
    }
  }

  // High-impact category without directional keyword → violet "watch" badge.
  // We hint the active regime so the user sees "vigilar bajo RISK_OFF".
  if (category === 'monetary' || category === 'inflation' || category === 'labor') {
    const regimeHint = regime === 'RISK_OFF' ? ' · CTX RISK-OFF' : regime === 'RISK_ON' ? ' · CTX RISK-ON' : ''
    return {
      tone: 'high-impact', label: `ALTO IMPACTO${regimeHint}`,
      edge:  'border-l-violet-500',
      glow:  'group-hover:shadow-[0_0_28px_-8px_rgba(167,139,250,0.55)]',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
      rowTint: 'hover:bg-violet-500/[0.04]',
      icon:  'zap',
    }
  }

  return {
    tone: 'neutral', label: 'INFO',
    edge:  'border-l-slate-600',
    glow:  'group-hover:shadow-[0_0_18px_-8px_rgba(148,163,184,0.4)]',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    rowTint: 'hover:bg-white/[0.02]',
    icon:  'shield',
  }
}

// Regime banner styles
export const REGIME_STYLE = {
  RISK_OFF: { label: 'RISK OFF', sub: 'Apetito de riesgo negativo',  dot: 'bg-rose-500',    ring: 'ring-rose-500/40 shadow-rose-500/30',       text: 'text-rose-300',    bg: 'from-rose-950/40 via-rose-950/10 to-transparent',     border: 'border-rose-500/30'    },
  RISK_ON:  { label: 'RISK ON',  sub: 'Apetito de riesgo positivo',  dot: 'bg-emerald-500', ring: 'ring-emerald-500/40 shadow-emerald-500/30', text: 'text-emerald-300', bg: 'from-emerald-950/40 via-emerald-950/10 to-transparent', border: 'border-emerald-500/30' },
  MIXED:    { label: 'MIXTO',    sub: 'Señales contradictorias — cautela', dot: 'bg-amber-400', ring: 'ring-amber-400/40 shadow-amber-400/30', text: 'text-amber-300',   bg: 'from-amber-950/40 via-amber-950/10 to-transparent',   border: 'border-amber-400/30'   },
}
