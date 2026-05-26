/* src/components/ThesisReport.tsx */
import * as React from 'react';
import type { Thesis } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { THESIS_STYLE } from '../lib/confluence.style';
import { Ico, Pill } from './_primitives';

export interface ThesisReportProps { thesis: Thesis; }

export function ThesisReport({ thesis }: ThesisReportProps) {
  const t = THESIS_STYLE[thesis.direction];
  const ring = thesis.alignment_pct >= 75
    ? (t.tone === 'bull' ? 'signal-strong' : t.tone === 'bear' ? 'signal-strong bear' : 'signal-warn')
    : '';
  return (
    <div className={`panel ${ring}`}>
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: t.dot }}/>OPERATIONAL THESIS · CURRENT BIAS</div>
        <div className="right"><Pill tone={t.tone}>{t.label}</Pill></div>
      </div>
      <div className="col p-5 gap-4">
        <div className="row items-start gap-3">
          <Ico.target style={{ color: `var(--${t.tone})`, marginTop: 2 }}/>
          <div className="col gap-2 flex-1">
            <span className="label">HEADLINE</span>
            <span className="h2 t-fg0">{thesis.headline}</span>
          </div>
        </div>
        <div className="row gap-3">
          <Block title="CONFIRMING"   tone="bull"    icon={<Ico.check/>} items={thesis.confirming}/>
          <Block title="DIVERGING"    tone="bear"    icon={<Ico.cross/>} items={thesis.diverging}/>
          <Block title="NEWS / FUND." tone="overlap" icon={<Ico.news/>}  items={thesis.news_commentary}/>
        </div>
        <div style={{ border: `1px solid var(--${t.tone}-line)`, background: `var(--${t.tone}-bg)`, padding: '14px 16px' }}>
          <div className="row items-center justify-between" style={{ marginBottom: 8 }}>
            <span className="label" style={{ color: `var(--${t.tone})` }}>EXPECTATION · OPERATIONAL PLAYBOOK</span>
            <span className="label">PLAN</span>
          </div>
          <span className="body-md t-fg1">{thesis.expectation}</span>
        </div>
      </div>
    </div>
  );
}

function Block({ title, tone, icon, items }: { title: string; tone: Tone; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="col flex-1" style={{ border: '1px solid var(--line-2)', background: 'var(--bg-2)' }}>
      <div className="panel-head" style={{ minHeight: 28 }}>
        <div className="left" style={{ color: `var(--${tone})` }}>{icon} {title}</div>
        <div className="right">{items.length}</div>
      </div>
      <ul className="col p-3 gap-2" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
        {items.map((it, i) => (
          <li key={i} className="row gap-2 items-start">
            <span style={{ width: 5, height: 5, marginTop: 6, background: `var(--${tone})`, opacity: .8, flexShrink: 0 }}/>
            <span className="t-fg1">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
