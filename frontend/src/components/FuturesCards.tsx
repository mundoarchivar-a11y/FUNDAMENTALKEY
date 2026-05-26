/* src/components/FuturesCards.tsx */
import type { MacroLog } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { Ico, Pill, Delta, Sparkline, StrengthBar, fmt } from './_primitives';
import { MiniCell, defaultSpark } from './FxBiasCards';

export interface FuturesCardsProps { data: MacroLog; }

export function FuturesCards({ data }: FuturesCardsProps) {
  const thesis = data.thesis;
  const find = (k: string) => thesis?.fractal_rows.find(r => r.key === k);
  const pairs = [
    {
      key: 'nasdaq', label: 'NQ · NASDAQ',
      level: data.fractal?.nasdaq?.level ?? 0,
      delta: data.nasdaq_delta,
      row: find('nasdaq'),
      strong: Math.abs(data.nasdaq_delta) > 1.0 && data.macro_regime === 'RISK_OFF' && data.nasdaq_delta < 0,
      divergent: false,
      spark: data.sparks?.nasdaq ?? defaultSpark(17, -1.6),
    },
    {
      key: 'sp500', label: 'ES · S&P 500',
      level: data.fractal?.sp500?.level ?? 0,
      delta: data.sp500_delta,
      row: find('sp500'),
      strong: false, divergent: false,
      spark: data.sparks?.sp500 ?? defaultSpark(18, -1.1),
    },
  ];
  return (
    <div className="row gap-3">
      {pairs.map(p => {
        const tone: Tone = p.delta > 0 ? 'bull' : p.delta < 0 ? 'bear' : 'neutral';
        const cls = `panel flex-1 relative hoverable ${p.strong ? (tone === 'bull' ? 'signal-strong' : 'signal-strong bear') : p.divergent ? 'signal-warn' : ''}`;
        return (
          <div key={p.key} className={cls}>
            <div className="panel-head">
              <div className="left"><span className="dot" style={{ background: `var(--${tone})` }}/>{p.label}</div>
              <div className="right">
                {p.strong ? (
                  <span className={`tick ${tone === 'bull' ? 'bull' : 'bear'} pulse`}><Ico.zap/> SEÑAL FUERTE</span>
                ) : p.divergent ? (
                  <span className="tick warn"><Ico.warn/> DIVERGENTE</span>
                ) : (
                  <span>FUTURES · CME</span>
                )}
              </div>
            </div>
            <div className="row p-4 gap-4 items-start">
              <div className="col flex-1 gap-2">
                <span className="num-hero tnum t-fg0">{fmt.num(p.level, p.level > 1000 ? 0 : 2)}</span>
                <Delta value={p.delta} size="md"/>
              </div>
              <div className="col gap-2 items-end" style={{ minWidth: 110 }}>
                <span className="label">BIAS</span>
                <Pill tone={tone}>{p.delta > 0 ? 'BULLISH' : 'BEARISH'}</Pill>
                <div style={{ width: 100, marginTop: 6 }}>
                  <StrengthBar value={Math.min(100, Math.abs(p.delta) * 40)} tone={tone} height={6} segments={6}/>
                </div>
              </div>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <Sparkline data={p.spark} tone={tone} height={56} showGrid/>
            </div>
            {p.row && (
              <div className="row" style={{ borderTop: '1px solid var(--line-2)' }}>
                <MiniCell label="D" value={p.row.d} trend={p.row.trends.d} unit={p.row.unit}/>
                <div className="vr"/>
                <MiniCell label="W" value={p.row.w} trend={p.row.trends.w} unit={p.row.unit}/>
                <div className="vr"/>
                <MiniCell label="M" value={p.row.m} trend={p.row.trends.m} unit={p.row.unit}/>
                <div className="vr"/>
                <div className="col flex-1 items-center justify-center p-3 gap-1">
                  <span className="label">ALIGN</span>
                  <div className="row items-center gap-1">
                    {p.row.aligned
                      ? <><Ico.check className="t-bull"/><span className="num-sm t-bull">YES</span></>
                      : <><Ico.cross className="t-warn"/><span className="num-sm t-warn">NO</span></>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
