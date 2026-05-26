/* src/components/FxBiasCards.tsx */
import type { MacroLog, FractalRow } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { Ico, Pill, Delta, Sparkline, TrendArrow, fmt } from './_primitives';

export interface FxBiasCardsProps { data: MacroLog; }

export function FxBiasCards({ data }: FxBiasCardsProps) {
  const dxyUp = data.dxy_delta > 0;
  const thesis = data.thesis;
  const find = (k: string) => thesis?.fractal_rows.find(r => r.key === k);
  const pairs = [
    {
      key: 'eurusd', label: 'EUR/USD',
      level: data.eurusd_level, delta: data.eurusd_delta,
      row: find('eurusd'),
      strong: Math.abs(data.eurusd_delta) > 0.4 && (data.eurusd_delta < 0) === dxyUp,
      divergent: false,
      spark: data.sparks?.eurusd ?? defaultSpark(15, -1.2),
      decimals: 5,
    },
    {
      key: 'gbpusd', label: 'GBP/USD',
      level: data.gbpusd_level, delta: data.gbpusd_delta,
      row: find('gbpusd'),
      strong: false,
      divergent: dxyUp && Math.abs(data.gbpusd_delta) < 0.15,
      spark: data.sparks?.gbpusd ?? defaultSpark(16, -0.2),
      decimals: 5,
    },
  ];
  return (
    <div className="row gap-3">
      {pairs.map(p => <PairCard key={p.key} pair={p}/>)}
    </div>
  );
}

interface Pair {
  key: string; label: string; level: number; delta: number;
  row?: FractalRow; strong: boolean; divergent: boolean;
  spark: number[]; decimals: number;
}
function PairCard({ pair }: { pair: Pair }) {
  const tone: Tone = pair.delta > 0 ? 'bull' : pair.delta < 0 ? 'bear' : 'neutral';
  const cls = `panel flex-1 relative hoverable ${pair.strong ? (tone === 'bull' ? 'signal-strong' : 'signal-strong bear') : pair.divergent ? 'signal-warn' : ''}`;
  return (
    <div className={cls}>
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: `var(--${tone})` }}/>{pair.label}</div>
        <div className="right">
          {pair.strong ? (
            <span className={`tick ${tone === 'bull' ? 'bull' : 'bear'} pulse`}><Ico.zap/> SEÑAL FUERTE</span>
          ) : pair.divergent ? (
            <span className="tick warn"><Ico.warn/> DIVERGENTE</span>
          ) : (
            <span>FX MAJOR · SPOT</span>
          )}
        </div>
      </div>
      <div className="col">
        <div className="row p-4 gap-4 items-start">
          <div className="col flex-1 gap-2">
            <span className="num-hero tnum t-fg0">{pair.level.toFixed(pair.decimals)}</span>
            <Delta value={pair.delta} size="md"/>
          </div>
          <div className="col gap-2 items-end" style={{ minWidth: 100 }}>
            <span className="label">BIAS</span>
            <Pill tone={tone}>{pair.delta > 0 ? 'BULLISH' : 'BEARISH'}</Pill>
          </div>
        </div>
        <div style={{ padding: '0 16px 12px' }}>
          <Sparkline data={pair.spark} tone={tone} height={56} showGrid/>
        </div>
        {pair.row && (
          <div className="row" style={{ borderTop: '1px solid var(--line-2)' }}>
            <MiniCell label="D" value={pair.row.d} trend={pair.row.trends.d} unit={pair.row.unit}/>
            <div className="vr"/>
            <MiniCell label="W" value={pair.row.w} trend={pair.row.trends.w} unit={pair.row.unit}/>
            <div className="vr"/>
            <MiniCell label="M" value={pair.row.m} trend={pair.row.trends.m} unit={pair.row.unit}/>
            <div className="vr"/>
            <div className="col flex-1 items-center justify-center p-3 gap-1">
              <span className="label">ALIGN</span>
              <div className="row items-center gap-1">
                {pair.row.aligned
                  ? <><Ico.check className="t-bull"/><span className="num-sm t-bull">YES</span></>
                  : <><Ico.cross className="t-warn"/><span className="num-sm t-warn">NO</span></>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniCell({ label, value, trend, unit }: { label: string; value: number; trend: 'UP'|'DOWN'|'FLAT'; unit: 'pct'|'bps'|'pts' }) {
  return (
    <div className="col flex-1 items-center justify-center p-3 gap-1">
      <span className="label">{label}</span>
      <div className="row items-center gap-1">
        <TrendArrow trend={trend}/>
        <span className={'num-sm tnum t-' + (trend === 'UP' ? 'bull' : trend === 'DOWN' ? 'bear' : 'neutral')}>
          {unit === 'bps' ? fmt.bps(value) : unit === 'pts' ? fmt.pts(value, 2) : fmt.pct(value, 2)}
        </span>
      </div>
    </div>
  );
}

/** Deterministic fallback series if MacroLog.sparks is not provided. */
export function defaultSpark(seed: number, trend = 0, n = 30, vol = 1): number[] {
  let s = seed * 9301 + 49297;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: number[] = []; let v = 50;
  for (let i = 0; i < n; i++) { v += (rng() - 0.5) * vol * 6 + trend * 0.6; out.push(v); }
  return out;
}
