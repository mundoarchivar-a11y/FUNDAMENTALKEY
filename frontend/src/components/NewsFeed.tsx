/* src/components/NewsFeed.tsx */
import * as React from 'react';
import type { NewsItem, MacroRegime } from '../types/macro';
import { CATEGORY_STYLE, inferNewsBias, type NewsBiasKey } from '../lib/confluence.style';
import { Ico, Pill, fmtTZHM, ET_TZ } from './_primitives';

export interface NewsFeedProps { news: NewsItem[] | null; regime: MacroRegime; }

export function NewsFeed({ news }: NewsFeedProps) {
  const [filter, setFilter] = React.useState<NewsBiasKey | 'all'>('all');
  const [hover, setHover] = React.useState<number | null>(null);

  const items = (news || []).map(n => ({ ...n, bias: inferNewsBias(n) }));
  const filtered = filter === 'all' ? items : items.filter(i => i.bias.key === filter);

  const filters: { id: NewsBiasKey | 'all'; label: string; tone: any }[] = [
    { id: 'all',         label: 'ALL',         tone: 'neutral' },
    { id: 'risk-off',    label: 'RISK OFF',    tone: 'bear'    },
    { id: 'risk-on',     label: 'RISK ON',     tone: 'bull'    },
    { id: 'hawkish',     label: 'HAWKISH',     tone: 'warn'    },
    { id: 'dovish',      label: 'DOVISH',      tone: 'dovish'  },
    { id: 'high-impact', label: 'HIGH IMPACT', tone: 'asia'    },
    { id: 'neutral',     label: 'NEUTRAL',     tone: 'neutral' },
  ];

  return (
    <div className="panel flex-1">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bull)' }}/>NEWS FEED · BIAS INFERENCE</div>
        <div className="right">{filtered.length} / {items.length} ITEMS</div>
      </div>
      <div className="row" style={{ borderBottom: '1px solid var(--line-2)', overflowX: 'auto', background: 'var(--bg-1)' }}>
        {filters.map(f => {
          const count = f.id === 'all' ? items.length : items.filter(i => i.bias.key === f.id).length;
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRight: '1px solid var(--line-2)', background: active ? `var(--${f.tone}-bg)` : 'transparent', borderBottom: active ? `2px solid var(--${f.tone})` : '2px solid transparent', marginBottom: -1 }}>
              <span style={{ width: 7, height: 7, background: `var(--${f.tone})`, opacity: active ? 1 : .6 }}/>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, color: active ? 'var(--fg-0)' : 'var(--fg-2)' }}>{f.label}</span>
              <span className="t-fg4" style={{ fontSize: 10 }}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="col">
        {filtered.length === 0 && (
          <div className="p-5 t-fg3" style={{ fontSize: 12, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No items match this filter.</div>
        )}
        {filtered.map((n, i) => {
          const tone = n.bias.tone;
          const isHover = hover === i;
          const cat = CATEGORY_STYLE[n.category];
          return (
            <a key={i} href={n.link || '#'} target="_blank" rel="noreferrer" className="row hoverable"
               onMouseEnter={() => setHover(i)}
               onMouseLeave={() => setHover(null)}
               style={{ textDecoration: 'none', color: 'inherit', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none', background: isHover ? `color-mix(in oklab, var(--${tone}-bg) 60%, transparent)` : 'transparent', position: 'relative' }}>
              <div style={{ width: 4, background: `var(--${tone})`, opacity: .9, boxShadow: isHover ? `0 0 12px var(--${tone}-glow)` : 'none' }}/>
              <div className="col items-center justify-center" style={{ width: 80, padding: '14px 8px', borderRight: '1px solid var(--line-2)' }}>
                <span className="num-sm tnum t-fg0">{n.published_at ? fmtTZHM(new Date(n.published_at), ET_TZ) : '—'}</span>
                <span className="t-fg4" style={{ fontSize: 9, letterSpacing: '0.12em', marginTop: 2 }}>ET</span>
              </div>
              <div className="col flex-1 gap-2" style={{ padding: '12px 16px', minWidth: 0 }}>
                <div className="row gap-2 items-center wrap">
                  <Pill tone={tone}>{n.bias.label}</Pill>
                  <Pill tone={cat.tone}>{cat.label}</Pill>
                  <span className="t-fg4" style={{ fontSize: 10, letterSpacing: '0.1em' }}>· {n.publisher}</span>
                  <span className="t-fg4" style={{ fontSize: 10, letterSpacing: '0.06em' }}>· {n.ticker}</span>
                </div>
                <span className="t-fg0" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5, lineHeight: 1.45, fontWeight: 500 }}>{n.title}</span>
              </div>
              <div className="col items-center justify-center" style={{ width: 60, padding: '0 12px', opacity: isHover ? 1 : 0.4 }}>
                <Ico.external style={{ color: `var(--${tone})` }}/>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
