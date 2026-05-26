/* ───────────────────────────────────────────────────────────────
   src/components/_primitives.tsx
   Shared primitives + icon set + helpers used by the dashboard.
   No external deps — all icons are inline SVG (replaces lucide-react).
   Drop-in: existing components import { Sparkline, Pill, ... } from here.
─────────────────────────────────────────────────────────────── */

import * as React from 'react';
import type { Tone } from '../lib/confluence.style';

const { useState, useEffect } = React;

/* ── Icon set (16×16 viewBox, currentColor) ─────────────────── */
type IcoProps = React.SVGProps<SVGSVGElement>;
export const Ico = {
  zap:      (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M9 1 L2 9 L7 9 L6 15 L13 7 L8 7 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity=".18"/></svg>,
  warn:     (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M8 2 L15 14 L1 14 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6 V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="12" r=".8" fill="currentColor"/></svg>,
  check:    (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 8 L7 12 L13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cross:    (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  dot:      (p: IcoProps) => <svg width="10" height="10" viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>,
  up:       (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 11 L8 5 L13 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  down:     (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 5 L8 11 L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  flat:     (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 8 L13 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  arrowUR:  (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M4 12 L12 4 M6 4 H12 V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowDR:  (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M4 4 L12 12 M12 6 V12 H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock:    (p: IcoProps) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.5 V8 L10.5 9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  refresh:  (p: IcoProps) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" {...p}><path d="M2 8 a6 6 0 0 1 10.2 -4.2 M14 4 V8 H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M14 8 a6 6 0 0 1 -10.2 4.2 M2 12 V8 H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  globe:    (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 8 H14 M8 2 c2.5 2.5 2.5 9.5 0 12 c-2.5 -2.5 -2.5 -9.5 0 -12" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>,
  chart:    (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M2 14 V2 M2 14 H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><rect x="4" y="9" width="2" height="4" fill="currentColor"/><rect x="7.5" y="6" width="2" height="7" fill="currentColor"/><rect x="11" y="3" width="2" height="10" fill="currentColor"/></svg>,
  news:     (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><rect x="2" y="3" width="12" height="10" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6 H11 M5 9 H11 M5 11 H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  flame:    (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M8 1 c1.5 2 3 4 3 6.5 a3 3 0 0 1 -6 0 c0 -1 .5 -1.8 1 -2.5 c.5 1 1 1.5 1.5 1.5 c0 -2 0 -3.5 .5 -5.5 Z" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity=".2" strokeLinejoin="round"/></svg>,
  target:   (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r=".8" fill="currentColor"/></svg>,
  external: (p: IcoProps) => <svg width="11" height="11" viewBox="0 0 16 16" fill="none" {...p}><path d="M4 12 L12 4 M6 4 H12 V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD:    (p: IcoProps) => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 6 L8 11 L13 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shield:   (p: IcoProps) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}><path d="M8 1 L14 3 V8 c0 4 -3 6 -6 7 c-3 -1 -6 -3 -6 -7 V3 Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M8 5 V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="11" r=".7" fill="currentColor"/></svg>,
  logo:     (p: IcoProps) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}>
    <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M3 16 L7 11 L10 13 L14 6 L19 9" stroke="var(--bull)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="14" cy="6" r="1.6" fill="var(--bull)"/>
    <path d="M3 19 H19" stroke="currentColor" strokeWidth=".8" opacity=".4"/>
  </svg>,
};

/* ── Formatters ───────────────────────────────────────────── */
export const fmt = {
  pct: (v: number, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d) + '%',
  bps: (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + ' bps',
  pts: (v: number, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d),
  num: (v: number, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }),
};

/* ── Sparkline ─────────────────────────────────────────────── */
export interface SparklineProps {
  data: number[];
  tone?: Tone | 'fg0' | 'fg1' | 'fg2';
  height?: number;
  showArea?: boolean;
  showDot?: boolean;
  showGrid?: boolean;
  onHover?: (idx: number | null, value: number | null) => void;
}
export function Sparkline({ data, tone = 'fg2', height = 36, showArea = true, showDot = true, showGrid = false, onHover }: SparklineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const points = data.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return [x, y] as [number, number];
  });
  const path = 'M ' + points.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ');
  const area = path + ` L 100 100 L 0 100 Z`;
  const last = points[points.length - 1];
  return (
    <div className={'spark t-' + tone} style={{ height, width: '100%', position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={(e) => {
          if (!onHover) return;
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const idx = Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (n - 1))));
          setHover(idx); onHover(idx, data[idx]);
        }}
        onMouseLeave={() => { setHover(null); onHover && onHover(null, null); }}>
        {showGrid && (
          <>
            <line className="grid" x1="0" y1="25" x2="100" y2="25" vectorEffect="non-scaling-stroke"/>
            <line className="grid" x1="0" y1="50" x2="100" y2="50" vectorEffect="non-scaling-stroke"/>
            <line className="grid" x1="0" y1="75" x2="100" y2="75" vectorEffect="non-scaling-stroke"/>
          </>
        )}
        {showArea && <path className="area" d={area}/>}
        <path className="line" d={path} vectorEffect="non-scaling-stroke"/>
        {showDot && <circle className="dot" cx={last[0]} cy={last[1]} r="1.6" vectorEffect="non-scaling-stroke"/>}
        {hover != null && (
          <g>
            <line x1={points[hover][0]} y1="0" x2={points[hover][0]} y2="100" stroke="currentColor" strokeOpacity=".35" strokeWidth=".4" vectorEffect="non-scaling-stroke"/>
            <circle cx={points[hover][0]} cy={points[hover][1]} r="2" fill="currentColor" vectorEffect="non-scaling-stroke"/>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ── Trend arrow ──────────────────────────────────────────── */
export function TrendArrow({ trend }: { trend: 'UP' | 'DOWN' | 'FLAT' }) {
  if (trend === 'UP')   return <Ico.up   className="t-bull"/>;
  if (trend === 'DOWN') return <Ico.down className="t-bear"/>;
  return <Ico.flat className="t-neutral"/>;
}

/* ── Pill ─────────────────────────────────────────────────── */
export function Pill({ tone = 'neutral', children, dot = true, icon, style, className = '' }: {
  tone?: Tone; children: React.ReactNode; dot?: boolean;
  icon?: React.ReactNode; style?: React.CSSProperties; className?: string;
}) {
  return (
    <span className={`pill t-${tone} ${className}`} style={{ borderColor: `var(--${tone}-line)`, background: `var(--${tone}-bg)`, ...style }}>
      {dot && <span className="bullet"/>}
      {icon}
      <span style={{ color: 'var(--fg-1)' }}>{children}</span>
    </span>
  );
}

/* ── Delta number ─────────────────────────────────────────── */
export function Delta({ value, unit = 'pct', size = 'sm', decimals }: {
  value: number; unit?: 'pct' | 'bps' | 'pts'; size?: 'sm' | 'md' | 'lg'; decimals?: number;
}) {
  const tone: Tone = value > 0 ? 'bull' : value < 0 ? 'bear' : 'neutral';
  const d = decimals != null ? decimals : (unit === 'bps' ? 1 : 2);
  const v = unit === 'bps' ? fmt.bps(value) : unit === 'pts' ? fmt.pts(value, d) : fmt.pct(value, d);
  const cls = size === 'lg' ? 'num-lg' : size === 'md' ? 'num-md' : 'num-sm';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '◆';
  return (
    <span className={`${cls} t-${tone} tnum`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: '.75em' }}>{arrow}</span> {v}
    </span>
  );
}

/* ── Gauge ────────────────────────────────────────────────── */
export function Gauge({ value, label = 'ALIGNMENT', size = 220, thresholds = [50, 75], tone }: {
  value: number; label?: string; size?: number; thresholds?: [number, number]; tone?: Tone;
}) {
  const v = Math.max(0, Math.min(100, value));
  const cx = size / 2, cy = size * 0.72, r = size * 0.42;
  const start = Math.PI, end = 2 * Math.PI;
  const angle = start + (end - start) * (v / 100);
  const autoTone: Tone = v < thresholds[0] ? 'bear' : v < thresholds[1] ? 'warn' : 'bull';
  const t: Tone = tone || autoTone;
  const polar = (a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const arc = (a1: number, a2: number) => {
    const [x1, y1] = polar(a1), [x2, y2] = polar(a2);
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = start + (end - start) * (i / 20);
    const inner = 0.92, outer = i % 4 === 0 ? 1.06 : 1.02;
    ticks.push(<line key={i}
      x1={cx + r * inner * Math.cos(a)} y1={cy + r * inner * Math.sin(a)}
      x2={cx + r * outer * Math.cos(a)} y2={cy + r * outer * Math.sin(a)}
      stroke="var(--fg-3)" strokeWidth={i % 4 === 0 ? 1.2 : 0.6} opacity={i % 4 === 0 ? 0.9 : 0.5}/>);
  }
  const a50 = start + (end - start) * (thresholds[0] / 100);
  const a75 = start + (end - start) * (thresholds[1] / 100);
  return (
    <div className="col items-center" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size * 0.82}>
        <path d={arc(start, a50)} stroke="var(--bear-line)" strokeWidth="3" fill="none" opacity=".25"/>
        <path d={arc(a50, a75)}   stroke="var(--warn-line)" strokeWidth="3" fill="none" opacity=".25"/>
        <path d={arc(a75, end)}   stroke="var(--bull-line)" strokeWidth="3" fill="none" opacity=".25"/>
        <path d={arc(start, end)} stroke="var(--line-2)" strokeWidth="12" fill="none"/>
        <path d={arc(start, angle)} stroke={`var(--${t})`} strokeWidth="12" fill="none"
              style={{ filter: `drop-shadow(0 0 12px var(--${t}-glow))` }}/>
        {ticks}
        <text x={cx} y={cy - r * 0.05} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="800" fontSize={size * 0.22} fill={`var(--${t})`} style={{ letterSpacing: '-0.04em' }}>{Math.round(v)}</text>
        <text x={cx} y={cy + r * 0.18} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="600" fontSize={size * 0.07} fill="var(--fg-3)" style={{ letterSpacing: '0.22em' }}>/ 100</text>
        <line x1={cx} y1={cy}
              x2={cx + r * 0.95 * Math.cos(angle)} y2={cy + r * 0.95 * Math.sin(angle)}
              stroke={`var(--${t})`} strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="3" fill={`var(--${t})`}/>
      </svg>
      <div className="label" style={{ marginTop: -8, color: 'var(--fg-2)' }}>{label}</div>
    </div>
  );
}

/* ── Strength bar ─────────────────────────────────────────── */
export function StrengthBar({ value, tone = 'bull', height = 4, segments = 0 }: {
  value: number; tone?: Tone; height?: number; segments?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  if (segments > 0) {
    const filled = Math.round((v / 100) * segments);
    return (
      <div className="row gap-1" style={{ width: '100%' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height,
            background: i < filled ? `var(--${tone})` : 'var(--line-2)',
            boxShadow: i < filled ? `0 0 6px var(--${tone}-glow)` : 'none',
          }}/>
        ))}
      </div>
    );
  }
  return (
    <div style={{ height, background: 'var(--line-2)', width: '100%', position: 'relative' }}>
      <div style={{ width: v + '%', height: '100%', background: `var(--${tone})`, boxShadow: `0 0 12px var(--${tone}-glow)` }}/>
    </div>
  );
}

/* ── Heatmap cell ─────────────────────────────────────────── */
export function HeatCell({ value, unit, trend }: {
  value: number; unit: 'pct' | 'bps' | 'pts'; trend: 'UP' | 'DOWN' | 'FLAT';
}) {
  const t: Tone = trend === 'UP' ? 'bull' : trend === 'DOWN' ? 'bear' : 'neutral';
  const mag = Math.min(1, Math.abs(value) / (unit === 'bps' ? 25 : 3));
  const bgAlpha = 0.05 + mag * 0.25;
  const display = unit === 'bps' ? fmt.bps(value) : unit === 'pts' ? fmt.pts(value, 2) : fmt.pct(value, 2);
  return (
    <div className="heat" style={{
      background: `color-mix(in oklab, var(--${t}) ${bgAlpha * 100}%, var(--bg-2))`,
      borderColor: `color-mix(in oklab, var(--${t}-line) ${30 + mag * 50}%, var(--line-2))`,
      color: `var(--${t})`,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {trend === 'UP' ? <Ico.up/> : trend === 'DOWN' ? <Ico.down/> : <Ico.flat/>}
        <span className="tnum" style={{ color: 'var(--fg-1)' }}>{display}</span>
      </span>
    </div>
  );
}

/* ── Live ticker hook ─────────────────────────────────────── */
export function useTicker(ms = 1000) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return new Date();
}

/* ── Timezone helpers ─────────────────────────────────────── */
export const ET_TZ = 'America/New_York';
export const BA_TZ = 'America/Argentina/Buenos_Aires';

export interface ETParts { weekday: string; h: number; m: number; s: number; hourFloat: number; }
export function getETParts(d: Date): ETParts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ, hour12: false,
    weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d);
  const map = Object.fromEntries(f.map(p => [p.type, p.value]));
  return { weekday: map.weekday, h: +map.hour, m: +map.minute, s: +map.second,
           hourFloat: +map.hour + (+map.minute)/60 + (+map.second)/3600 };
}
export const fmtTZ   = (d: Date, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d);
export const fmtTZHM = (d: Date, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' }).format(d);
