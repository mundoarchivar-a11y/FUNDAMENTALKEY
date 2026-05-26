/* src/components/MacroBanner.tsx */
import type { MacroLog } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { REGIME_STYLE } from '../lib/confluence.style';
import { Sparkline, Delta, fmt } from './_primitives';
import { defaultSpark } from './FxBiasCards';

export interface MacroBannerProps { data: MacroLog; }

export function MacroBanner({ data }: MacroBannerProps) {
  const regime = REGIME_STYLE[data.macro_regime];
  const ringCls = data.macro_regime === 'RISK_OFF' ? 'signal-strong bear' : data.macro_regime === 'RISK_ON' ? 'signal-strong' : 'signal-warn';
  return (
    <div className={`panel ${ringCls}`}>
      <div className="row items-stretch">
        <div className="col p-4 gap-3" style={{ borderRight: '1px solid var(--line-2)', minWidth: 280 }}>
          <span className="label">MACRO REGIME</span>
          <div className="row gap-3 items-center">
            <span className="pulse-dot" style={{ width: 14, height: 14, background: regime.dot, boxShadow: `0 0 24px ${regime.dot}`, color: regime.dot }}/>
            <span className="num-xl t-fg0" style={{ letterSpacing: '0.04em' }}>{regime.label}</span>
          </div>
          <span className="t-fg3" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            Cross-asset risk de-rating; rates up, equities down, USD bid.
          </span>
        </div>

        <KpiCell label="DXY"    value={data.dxy_level}     delta={data.dxy_delta}       unit="pct" spark={data.sparks?.dxy    ?? defaultSpark(11, 1.2)}/>
        <KpiCell label="US 10Y" value={data.us10y_level}   delta={data.us10y_bps_delta} unit="bps" spark={data.sparks?.us10y  ?? defaultSpark(12, -0.8)} suffix="%"/>
        <KpiCell label="VIX"    value={data.vix_level}     delta={data.vix_pts_delta}   unit="pts" spark={data.sparks?.vix    ?? defaultSpark(14, 1.8)}/>
        <KpiCell label="10Y-2Y" value={data.spread_10y_2y} delta={data.us10y_bps_delta - data.us02y_bps_delta} unit="bps" spark={data.sparks?.spread ?? defaultSpark(19, -0.3)} suffix="%" last/>
      </div>
    </div>
  );
}

function KpiCell({ label, value, delta, unit, decimals = 2, spark, suffix = '', last }: {
  label: string; value: number; delta: number;
  unit: 'pct'|'bps'|'pts'; decimals?: number; spark: number[]; suffix?: string; last?: boolean;
}) {
  const tone: Tone = delta > 0 ? 'bull' : delta < 0 ? 'bear' : 'neutral';
  return (
    <div className="col flex-1 p-4 gap-2" style={{ borderRight: last ? 'none' : '1px solid var(--line-2)', minWidth: 180 }}>
      <div className="row items-center justify-between">
        <span className="label">{label}</span>
        <Delta value={delta} unit={unit} size="sm"/>
      </div>
      <div className="row items-baseline gap-1">
        <span className="num-xl tnum t-fg0">{fmt.num(value, decimals)}</span>
        {suffix && <span className="t-fg3" style={{ fontSize: 11 }}>{suffix}</span>}
      </div>
      <div style={{ marginTop: 4 }}>
        <Sparkline data={spark} tone={tone} height={28} showArea/>
      </div>
    </div>
  );
}
