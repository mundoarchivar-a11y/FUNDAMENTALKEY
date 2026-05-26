// ─────────────────────────────────────────────────────────────────────────────
// Macro Alignment Engine — Type contracts
// These mirror the Python payload 1:1. Frontend NEVER computes thesis logic.
// ─────────────────────────────────────────────────────────────────────────────

export type MacroRegime    = 'RISK_OFF' | 'RISK_ON' | 'MIXED'
export type FxBias         = 'USD_STRONG' | 'USD_WEAK' | 'MIXED'
export type ThesisDirection = 'BEARISH_RISK' | 'BULLISH_RISK' | 'CONSOLIDATION'
export type Trend          = 'UP' | 'DOWN' | 'FLAT'
export type VectorStatus   = 'CONFIRMS' | 'DIVERGES' | 'NEUTRAL'
export type FractalUnit    = 'pct' | 'bps' | 'pts'

export type NewsCategory =
  | 'monetary' | 'inflation' | 'labor' | 'growth' | 'geopolitics' | 'general'

export type EventImportance = 'high' | 'medium' | 'low'

// Aliases used by the v2 (terminal-pro) visual layer
export type Importance = EventImportance
export type Session    = 'london' | 'ny' | 'overlap'

// ── Fractal ──────────────────────────────────────────────────────────────────

export interface FractalAsset {
  level: number
  d: number
  w: number
  m: number
}

// Alias used by the v2 visual layer
export type FractalEntry = FractalAsset

export type FractalPayload = Record<string, FractalAsset>

export interface FractalRow {
  key: string
  label: string
  unit: FractalUnit
  level: number
  d: number
  w: number
  m: number
  trends: { d: Trend; w: Trend; m: Trend }
  aligned: boolean
  dominant_bias: Trend
}

// ── News + Calendar ──────────────────────────────────────────────────────────

export interface NewsItem {
  title: string
  publisher: string
  link: string | null
  published_at: string | null
  ticker: string
  category: NewsCategory
}

export interface UpcomingEvent {
  date: string
  time_utc?: string        // "HH:MM" UTC — present when known
  event: string
  importance: EventImportance
  currency: string
  session?: 'london' | 'ny' | 'overlap'
}

// ── Confluence vector ────────────────────────────────────────────────────────

export interface Vector {
  id: string
  label: string
  detail: string
  status: VectorStatus
  weight: number
}

// ── Thesis (computed in Python, rendered in TS) ──────────────────────────────

export interface Thesis {
  direction: ThesisDirection
  headline: string
  alignment_pct: number
  fractal_pct: number
  vectors: Vector[]
  fractal_rows: FractalRow[]
  confirming: string[]
  diverging: string[]
  news_commentary: string[]
  expectation: string
}

// ── Top-level record ─────────────────────────────────────────────────────────

export interface MacroLog {
  id: number
  fecha: string

  dxy_level: number
  dxy_delta: number             // %

  us10y_level: number
  us10y_bps_delta: number       // bps
  us02y_level: number
  us02y_bps_delta: number       // bps
  spread_10y_2y: number

  vix_level: number
  vix_pts_delta: number         // points

  eurusd_level: number
  eurusd_delta: number          // %
  gbpusd_level: number
  gbpusd_delta: number          // %

  nasdaq_delta: number          // %
  sp500_delta: number           // %

  macro_regime: MacroRegime
  fx_bias: FxBias

  fractal: FractalPayload | null
  news: NewsItem[] | null
  upcoming_events: UpcomingEvent[] | null
  thesis: Thesis | null

  created_at: string

  /** Optional sparkline series — v2 visual layer falls back to a seeded
   *  deterministic series via `defaultSpark()` when absent. Backend may
   *  populate this in the future. */
  sparks?: Partial<Record<string, number[]>>
}
