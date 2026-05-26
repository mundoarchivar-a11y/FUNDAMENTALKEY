/* ───────────────────────────────────────────────────────────────
   Drop-in replacement for the *_STYLE tables in src/lib/confluence.ts.
   Tone keys map to CSS vars defined in src/index.css.
   Copy these objects over the existing ones (keep fmtPct/fmtBps/etc.
   and the inferNewsBias logic body — only the returned tone classes
   change here).
─────────────────────────────────────────────────────────────── */

import type {
  MacroRegime,
  ThesisDirection,
  Importance,
  NewsCategory,
  VectorStatus,
} from '../types/macro';

/* Tone string is one of the CSS-variable bases declared in index.css.
   Components use it as: `var(--${tone})`, `var(--${tone}-line)`, etc. */
export type Tone =
  | 'bull' | 'bear' | 'warn'
  | 'london' | 'asia' | 'dovish' | 'overlap' | 'nypm'
  | 'neutral';

export interface ToneStyle {
  label: string;
  tone: Tone;
  /** Optional plain CSS color string for inline use (e.g. status dots). */
  dot?: string;
  /** Optional single-character glyph for terminal-style status markers. */
  icon?: string;
}

/* ─── REGIME_STYLE ───────────────────────────────────────── */
export const REGIME_STYLE: Record<MacroRegime, ToneStyle> = {
  RISK_OFF: { label: 'RISK OFF', tone: 'bear', dot: 'var(--bear)' },
  RISK_ON:  { label: 'RISK ON',  tone: 'bull', dot: 'var(--bull)' },
  MIXED:    { label: 'MIXED',    tone: 'warn', dot: 'var(--warn)' },
};

/* ─── THESIS_STYLE ───────────────────────────────────────── */
export const THESIS_STYLE: Record<ThesisDirection, ToneStyle> = {
  BEARISH_RISK:  { label: 'BEARISH',       tone: 'bear', dot: 'var(--bear)' },
  BULLISH_RISK:  { label: 'BULLISH',       tone: 'bull', dot: 'var(--bull)' },
  CONSOLIDATION: { label: 'CONSOLIDATION', tone: 'warn', dot: 'var(--warn)' },
};

/* ─── IMPORTANCE_STYLE ───────────────────────────────────── */
export const IMPORTANCE_STYLE: Record<Importance, ToneStyle> = {
  high:   { label: 'HIGH', tone: 'bear',    dot: 'var(--bear)'    },
  medium: { label: 'MED',  tone: 'warn',    dot: 'var(--warn)'    },
  low:    { label: 'LOW',  tone: 'neutral', dot: 'var(--neutral)' },
};

/* ─── CATEGORY_STYLE ─────────────────────────────────────── */
export const CATEGORY_STYLE: Record<NewsCategory, ToneStyle> = {
  monetary:    { label: 'MONETARY',  tone: 'overlap' },
  inflation:   { label: 'INFLATION', tone: 'bear'    },
  labor:       { label: 'LABOR',     tone: 'warn'    },
  growth:      { label: 'GROWTH',    tone: 'bull'    },
  geopolitics: { label: 'GEOPOL',    tone: 'asia'    },
  general:     { label: 'GENERAL',   tone: 'neutral' },
};

/* ─── VECTOR_STATUS_STYLE ────────────────────────────────── */
export const VECTOR_STATUS_STYLE: Record<VectorStatus, ToneStyle> = {
  CONFIRMS: { label: 'CONFIRMS', tone: 'bull',    icon: '✓' },
  DIVERGES: { label: 'DIVERGES', tone: 'bear',    icon: '✕' },
  NEUTRAL:  { label: 'NEUTRAL',  tone: 'neutral', icon: '◦' },
};

/* ─── inferNewsBias() ────────────────────────────────────────
   Same logic body as before — only the returned tone names change.
   Keep keywords/category gates exactly as in your prod confluence.ts. */
export type NewsBiasKey = 'risk-off' | 'risk-on' | 'hawkish' | 'dovish' | 'high-impact' | 'neutral';
export interface NewsBias { key: NewsBiasKey; label: string; tone: Tone; }

export function inferNewsBias(item: { title: string; category: NewsCategory }): NewsBias {
  const t = (item.title || '').toLowerCase();
  const cat = item.category;
  const test = (re: RegExp) => re.test(t);
  const riskOff = /\b(war|tariff|crisis|attack|sell.?off|plunge|crash|escalat|sanction)\b/;
  const riskOn  = /\b(rally|recovery|breakthrough|ceasefire|surge|deal|peace|stimulus)\b/;
  const hawkish = /\b(hawkish|hot|beat|tighten|sticky|higher for longer|surge|jump|hike)\b/;
  const dovish  = /\b(dovish|cool|miss|cut|ease|soft landing|slowing)\b/;
  if (cat === 'geopolitics' || test(riskOff))           return { key: 'risk-off',    label: 'RISK OFF',    tone: 'bear'    };
  if (test(riskOn))                                      return { key: 'risk-on',     label: 'RISK ON',     tone: 'bull'    };
  if (test(hawkish))                                     return { key: 'hawkish',     label: 'HAWKISH',     tone: 'warn'    };
  if (test(dovish))                                      return { key: 'dovish',      label: 'DOVISH',      tone: 'dovish'  };
  if (['monetary','inflation','labor'].includes(cat))    return { key: 'high-impact', label: 'HIGH IMPACT', tone: 'asia'    };
  return                                                       { key: 'neutral',     label: 'NEUTRAL',     tone: 'neutral' };
}
