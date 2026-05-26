/* src/components/FractalMatrix.tsx */
import * as React from 'react';
import type { FractalRow } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { Ico, Pill, HeatCell, fmt } from './_primitives';

export interface FractalMatrixProps {
  rows: FractalRow[];
  /** Optional 0–100 score, shown in panel header. */
  fractalPct?: number | null;
}

export function FractalMatrix({ rows, fractalPct }: FractalMatrixProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--overlap)' }}/>FRACTAL MATRIX · MULTITIMEFRAME</div>
        <div className="right">
          {fractalPct != null && <>
            <span style={{ color: 'var(--fg-3)' }}>SCORE</span>
            <span className="num-sm tnum t-fg0">{Math.round(fractalPct)} / 100</span>
          </>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 90px 100px', gap: 0 }}>
        <Hdr>ASSET</Hdr><Hdr center>DAILY</Hdr><Hdr center>WEEKLY</Hdr><Hdr center>MONTHLY</Hdr><Hdr center>BIAS</Hdr><Hdr center>ALIGNED</Hdr>

        {rows.map((r, i) => {
          const isLast = i === rows.length - 1;
          const tone: Tone = r.dominant_bias === 'UP' ? 'bull' : r.dominant_bias === 'DOWN' ? 'bear' : 'neutral';
          return (
            <React.Fragment key={r.key}>
              <div style={{ padding: '10px 12px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="t-fg0" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>{r.label}</span>
                <span className="t-fg3 tnum" style={{ fontSize: 10 }}>{fmt.num(r.level, r.level > 1000 ? 0 : 2)}</span>
              </div>
              <div style={{ padding: '4px 6px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none' }}><HeatCell value={r.d} unit={r.unit} trend={r.trends.d}/></div>
              <div style={{ padding: '4px 6px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none' }}><HeatCell value={r.w} unit={r.unit} trend={r.trends.w}/></div>
              <div style={{ padding: '4px 6px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none' }}><HeatCell value={r.m} unit={r.unit} trend={r.trends.m}/></div>
              <div style={{ padding: '10px 12px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill tone={tone}>{r.dominant_bias === 'UP' ? '↑ UP' : r.dominant_bias === 'DOWN' ? '↓ DOWN' : '· FLAT'}</Pill>
              </div>
              <div style={{ padding: '10px 12px', borderBottom: !isLast ? '1px solid var(--line-2)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.aligned ? <Ico.check className="t-bull"/> : <Ico.cross className="t-warn"/>}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Hdr({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <div className="label" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-2)', textAlign: center ? 'center' : 'left' }}>{children}</div>;
}
