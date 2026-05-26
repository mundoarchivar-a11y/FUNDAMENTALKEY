/* src/components/ConfluenceScorecard.tsx */
import type { Thesis } from '../types/macro';
import { THESIS_STYLE, VECTOR_STATUS_STYLE } from '../lib/confluence.style';
import { Pill, Gauge, StrengthBar } from './_primitives';

export interface ConfluenceScorecardProps { thesis: Thesis; }

export function ConfluenceScorecard({ thesis }: ConfluenceScorecardProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bull)' }}/>CONFLUENCE SCORE · CROSS-ASSET</div>
        <div className="right">{thesis.vectors.length} VECTORS</div>
      </div>
      <div className="row">
        <div className="col items-center justify-center p-4" style={{ borderRight: '1px solid var(--line-2)', minWidth: 280 }}>
          <Gauge value={thesis.alignment_pct} label="ALIGNMENT %"/>
          <div className="row gap-2" style={{ marginTop: 12 }}>
            <Pill tone={THESIS_STYLE[thesis.direction].tone}>{THESIS_STYLE[thesis.direction].label}</Pill>
            <Pill tone="overlap">FRACTAL {thesis.fractal_pct}</Pill>
          </div>
        </div>
        <div className="col flex-1">
          <div className="row" style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line-2)' }}>
            <div className="label" style={{ padding: '8px 12px', flex: 2 }}>VECTOR</div>
            <div className="label" style={{ padding: '8px 12px', width: 110, textAlign: 'center' }}>STATUS</div>
            <div className="label" style={{ padding: '8px 12px', width: 110, textAlign: 'right' }}>WEIGHT</div>
          </div>
          {thesis.vectors.map((v, i) => {
            const st = VECTOR_STATUS_STYLE[v.status];
            const last = i === thesis.vectors.length - 1;
            return (
              <div key={v.id} className="row items-center" style={{ borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
                <div className="col gap-1" style={{ padding: '10px 12px', flex: 2 }}>
                  <span className="t-fg0" style={{ fontWeight: 600, fontSize: 11.5, letterSpacing: '0.02em' }}>{v.label}</span>
                  <span className="t-fg3" style={{ fontSize: 10.5, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>{v.detail}</span>
                </div>
                <div style={{ padding: '10px 12px', width: 110, display: 'flex', justifyContent: 'center' }}>
                  <Pill tone={st.tone}>
                    <span style={{ fontFamily: 'JetBrains Mono', marginRight: 4 }}>{st.icon}</span>
                    {st.label}
                  </Pill>
                </div>
                <div style={{ padding: '10px 12px', width: 110 }}>
                  <div className="col gap-1 items-end">
                    <span className="num-sm tnum t-fg0">{Math.round(v.weight * 100)}%</span>
                    <div style={{ width: 80 }}>
                      <StrengthBar value={v.weight * 100} tone={st.tone} height={3}/>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
