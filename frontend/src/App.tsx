/* ───────────────────────────────────────────────────────────────
   src/App.tsx — reference layout.
   Header, DxyContext, ThesisExpectation, Tabs are inlined here
   (as they were in the original App.tsx per ARCHITECTURE.md).
   The named components live in src/components/*.tsx.

   Wire this to your existing useMacroData() hook — it already
   returns { data, loading, error, refetch } with the right shape.
─────────────────────────────────────────────────────────────── */

import * as React from 'react';
import { useMacroData } from './hooks/useMacroData';
import type { MacroLog, Thesis } from './types/macro';
import { REGIME_STYLE, THESIS_STYLE, type Tone } from './lib/confluence.style';
import {
  Ico, Pill, Delta, Sparkline, StrengthBar,
  useTicker, getETParts, fmtTZ, ET_TZ, BA_TZ, fmt,
} from './components/_primitives';
import { WeeklyTimeline }     from './components/WeeklyTimeline';
import { FxBiasCards, defaultSpark } from './components/FxBiasCards';
import { FuturesCards }       from './components/FuturesCards';
import { MacroBanner }        from './components/MacroBanner';
import { FractalMatrix }      from './components/FractalMatrix';
import { ConfluenceScorecard } from './components/ConfluenceScorecard';
import { ThesisReport }       from './components/ThesisReport';
import { SessionMeter }       from './components/SessionMeter';
import { NewsFeed }           from './components/NewsFeed';
import { UpcomingCalendar }   from './components/UpcomingCalendar';

type TabId = 'fx' | 'futures' | 'news';

export default function App() {
  const { data, loading, error, refetch, lastFetchedAt } = useMacroData();
  const [tab, setTab] = React.useState<TabId>('fx');

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') setTab('fx');
      if (e.key === '2') setTab('futures');
      if (e.key === '3') setTab('news');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!data) {
    return <div className="col items-center justify-center" style={{ height: '100vh', color: 'var(--fg-2)' }}>{loading ? 'LOADING…' : error || 'No data'}</div>;
  }

  return (
    <div className="col" style={{ minHeight: '100vh' }}>
      <Header data={data} onRefresh={refetch} isLoading={loading} lastFetchedAt={lastFetchedAt}/>
      <WeeklyTimeline events={data.upcoming_events}/>
      <Tabs value={tab} onChange={setTab}/>

      <div className="col gap-3 p-3" style={{ flex: 1 }}>
        {tab === 'fx'      && <FxTab data={data}/>}
        {tab === 'futures' && <FuturesTab data={data}/>}
        {tab === 'news'    && <NewsTab data={data}/>}
      </div>

      <div className="row items-center justify-between" style={{ padding: '10px 16px', borderTop: '1px solid var(--line-2)', background: 'var(--bg-1)', color: 'var(--fg-3)', fontSize: 10, letterSpacing: '0.14em' }}>
        <span>MACRO_ALIGNMENT_ENGINE · v2.0 · TERMINAL_PRO</span>
        <span>DATA · SUPABASE / MACRO_LOG</span>
        <span>BUILD {data.id.toString(16).toUpperCase().padStart(4,'0')}</span>
      </div>
    </div>
  );
}

/* ── TAB CONTENT ───────────────────────────────────────────── */
function FxTab({ data }: { data: MacroLog }) {
  if (!data.thesis) return null;
  const rows = data.thesis.fractal_rows.filter(r => ['eurusd','gbpusd','dxy'].includes(r.key));
  return (
    <>
      <DxyContext data={data}/>
      <FxBiasCards data={data}/>
      <FractalMatrix rows={rows} fractalPct={data.thesis.fractal_pct}/>
      <ThesisExpectation thesis={data.thesis}/>
    </>
  );
}

function FuturesTab({ data }: { data: MacroLog }) {
  if (!data.thesis) return null;
  return (
    <>
      <MacroBanner data={data}/>
      <FuturesCards data={data}/>
      <ConfluenceScorecard thesis={data.thesis}/>
      <FractalMatrix rows={data.thesis.fractal_rows} fractalPct={data.thesis.fractal_pct}/>
      <ThesisReport thesis={data.thesis}/>
    </>
  );
}

function NewsTab({ data }: { data: MacroLog }) {
  return (
    <>
      <SessionMeter events={data.upcoming_events}/>
      <div className="row gap-3 items-stretch">
        <NewsFeed news={data.news} regime={data.macro_regime}/>
        <UpcomingCalendar events={data.upcoming_events}/>
      </div>
    </>
  );
}

/* ── INLINE: Header (was inline in original App.tsx) ───────── */
function Header({ data, onRefresh, isLoading, lastFetchedAt }: { data: MacroLog; onRefresh: () => void; isLoading: boolean; lastFetchedAt: Date | null }) {
  const now = useTicker(1000);
  const snapshotAgeMin = (now.getTime() - new Date(data.fecha).getTime()) / 60000;
  const freshTone: Tone = snapshotAgeMin < 20 ? 'bull' : snapshotAgeMin < 60 ? 'warn' : 'bear';
  const freshLabel = snapshotAgeMin < 1
    ? 'JUST NOW'
    : snapshotAgeMin < 60
      ? `${Math.floor(snapshotAgeMin)}M AGO`
      : snapshotAgeMin < 1440
        ? `${Math.floor(snapshotAgeMin / 60)}H AGO`
        : `${Math.floor(snapshotAgeMin / 1440)}D AGO`;
  const pollLabel = lastFetchedAt
    ? `polled ${Math.max(0, Math.floor((now.getTime() - lastFetchedAt.getTime()) / 1000))}s`
    : 'polling…';
  const et = getETParts(now);
  const kz = activeKZ(et.hourFloat);
  const sess = sessionFor(et.hourFloat);
  const regime = REGIME_STYLE[data.macro_regime];
  return (
    <div className="panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="row items-stretch" style={{ minHeight: 56 }}>
        <div className="row items-center gap-3 px-4" style={{ borderRight: '1px solid var(--line-2)', minWidth: 280 }}>
          <Ico.logo style={{ color: 'var(--fg-0)' }}/>
          <div className="col gap-1">
            <div className="row gap-2 items-baseline">
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', color: 'var(--fg-0)' }}>MACRO_ALIGNMENT</span>
              <span className="label" style={{ color: 'var(--bull)' }}>v2.0</span>
            </div>
            <div className="row gap-2 items-center">
              <span className="t-fg3" style={{ fontSize: 10, letterSpacing: '0.16em' }}>ENGINE / DASHBOARD</span>
              <span className="t-fg3">·</span>
              <span className="t-bull" style={{ fontSize: 10, letterSpacing: '0.18em' }}>● LIVE</span>
            </div>
          </div>
        </div>
        <div className="row flex-1 items-center" style={{ borderRight: '1px solid var(--line-2)' }}>
          <StatusCell label="REGIME" tone={regime.tone}>
            <span className="t-fg0 num-md">{regime.label}</span>
            <span className="pulse-dot" style={{ width: 8, height: 8, background: regime.dot, color: regime.dot, display: 'inline-block', marginLeft: 8 }}/>
          </StatusCell>
          <StatusCell label="SESSION" tone={sess.tone}><span className="t-fg0 num-md">{sess.label}</span></StatusCell>
          <StatusCell label="KILLZONE" tone={kz ? kz.tone : 'neutral'}>
            <span className="num-md" style={{ color: kz ? `var(--${kz.tone})` : 'var(--fg-2)' }}>{kz ? kz.label : 'OFF'}</span>
          </StatusCell>
          <NextTransitionCell hourFloat={et.hourFloat}/>
        </div>
        <div className="row items-center gap-4 px-4" style={{ minWidth: 320 }}>
          <div className="row gap-3 items-center">
            <div className="col gap-1 items-end">
              <span className="label">NEW YORK</span>
              <span className="num-md tnum t-fg0">{fmtTZ(now, ET_TZ)}</span>
            </div>
            <div className="vr"/>
            <div className="col gap-1 items-end">
              <span className="label">BUENOS AIRES</span>
              <span className="num-md tnum t-fg2">{fmtTZ(now, BA_TZ)}</span>
            </div>
          </div>
          <div className="col gap-1 items-end" title={`Snapshot: ${new Date(data.fecha).toISOString()}`}>
            <span className="label" style={{ color: `var(--${freshTone})` }}>SNAPSHOT</span>
            <span className="num-md tnum" style={{ color: `var(--${freshTone})` }}>{freshLabel}</span>
            <span className="t-fg4" style={{ fontSize: 9, letterSpacing: '0.12em' }}>{pollLabel}</span>
          </div>
          <button onClick={onRefresh} title="Refresh data"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--line-3)', color: 'var(--fg-1)', background: 'var(--bg-3)' }}>
            <Ico.refresh className={isLoading ? 'pulse' : ''}/>
            <span className="label" style={{ color: 'var(--fg-1)' }}>REFRESH</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCell({ label, tone, children }: { label: string; tone: Tone; children: React.ReactNode }) {
  return (
    <div className="col gap-1 px-4" style={{ borderRight: '1px solid var(--line-2)', padding: '10px 18px', minWidth: 160 }}>
      <span className="label" style={{ color: `var(--${tone})` }}>{label}</span>
      <span className="row items-center">{children}</span>
    </div>
  );
}
function NextTransitionCell({ hourFloat }: { hourFloat: number }) {
  const nt = nextTransition(hourFloat);
  return (
    <div className="col gap-1 px-4" style={{ padding: '10px 18px', minWidth: 180 }}>
      <span className="label">NEXT TRANSITION</span>
      <span className="num-md t-fg0 tnum">
        {String(nt.m).padStart(2,'0')}:{String(nt.s).padStart(2,'0')}
        <span className="t-fg3" style={{ fontSize: 11, marginLeft: 6 }}>→ {nt.targetLabel}</span>
      </span>
    </div>
  );
}

/* ── INLINE: Tabs ──────────────────────────────────────────── */
function Tabs({ value, onChange }: { value: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: 'fx',      label: 'FX',              icon: <Ico.globe/>, sub: '4 components' },
    { id: 'futures', label: 'FUTURES & MACRO', icon: <Ico.chart/>, sub: '5 components' },
    { id: 'news',    label: 'NEWS',            icon: <Ico.news/>,  sub: '3 components' },
  ];
  return (
    <div className="row" style={{ borderBottom: '1px solid var(--line-2)', background: 'var(--bg-1)' }}>
      {tabs.map(t => {
        const active = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ padding: '10px 18px', borderRight: '1px solid var(--line-2)', borderBottom: active ? '2px solid var(--bull)' : '2px solid transparent', marginBottom: -1, background: active ? 'var(--bg-2)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: active ? 'var(--bull)' : 'var(--fg-3)' }}>{t.icon}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', color: active ? 'var(--fg-0)' : 'var(--fg-2)' }}>{t.label}</span>
            <span className="t-fg4" style={{ fontSize: 10, marginLeft: 4 }}>{t.sub}</span>
          </button>
        );
      })}
      <div className="flex-1"/>
      <div className="row items-center gap-3 px-4" style={{ color: 'var(--fg-3)', fontSize: 10, letterSpacing: '0.16em' }}>
        <span>[1] FX</span><span>[2] FUT</span><span>[3] NEWS</span>
      </div>
    </div>
  );
}

/* ── INLINE: DxyContext ────────────────────────────────────── */
function DxyContext({ data }: { data: MacroLog }) {
  const regime = REGIME_STYLE[data.macro_regime];
  const fxBias = data.fx_bias;
  const usdTone: Tone = fxBias === 'USD_STRONG' ? 'bull' : fxBias === 'USD_WEAK' ? 'bear' : 'warn';
  const usdLabel = fxBias === 'USD_STRONG' ? 'USD STRONG' : fxBias === 'USD_WEAK' ? 'USD WEAK' : 'USD MIXED';
  const dxyW = data.fractal?.dxy?.w ?? 0;
  const dxyM = data.fractal?.dxy?.m ?? 0;
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bull)' }}/>DXY · CONTEXT</div>
        <div className="right">USD DOLLAR INDEX · ICE</div>
      </div>
      <div className="row">
        <div className="col flex-1 p-4 gap-3" style={{ borderRight: '1px solid var(--line-2)' }}>
          <div className="row items-baseline gap-3">
            <span className="num-hero tnum t-fg0 cursorblink">{fmt.num(data.dxy_level, 2)}</span>
            <Delta value={data.dxy_delta} size="md"/>
          </div>
          <div className="row gap-3 items-center" style={{ marginTop: 4 }}>
            <Pill tone={regime.tone} icon={<Ico.shield/>}>{regime.label}</Pill>
            <Pill tone={usdTone} icon={<Ico.zap/>}>{usdLabel}</Pill>
          </div>
        </div>
        <div className="col flex-1" style={{ borderRight: '1px solid var(--line-2)' }}>
          <div className="row items-center justify-between" style={{ padding: '8px 12px' }}>
            <span className="label">30D TREND</span>
            <span className="t-fg3" style={{ fontSize: 10 }}>HOURLY × DAILY</span>
          </div>
          <div style={{ padding: '0 12px 12px', flex: 1 }}>
            <Sparkline data={data.sparks?.dxy ?? defaultSpark(11, 1.2)} tone="bull" height={80} showGrid/>
          </div>
        </div>
        <div className="col" style={{ minWidth: 240 }}>
          <MiniStat label="DAILY"   value={data.dxy_delta}/>
          <MiniStat label="WEEKLY"  value={dxyW}/>
          <MiniStat label="MONTHLY" value={dxyM} last/>
        </div>
      </div>
    </div>
  );
}
function MiniStat({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div className="row items-center justify-between" style={{ padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--line-2)', minHeight: 38 }}>
      <span className="label">{label}</span>
      <Delta value={value} size="md"/>
    </div>
  );
}

/* ── INLINE: ThesisExpectation ─────────────────────────────── */
function ThesisExpectation({ thesis }: { thesis: Thesis }) {
  const t = THESIS_STYLE[thesis.direction];
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: t.dot }}/>THESIS · CONDENSED</div>
        <div className="right"><Pill tone={t.tone}>{t.label}</Pill></div>
      </div>
      <div className="row p-4 gap-4 items-stretch">
        <div className="col gap-2" style={{ minWidth: 180 }}>
          <span className="label">ALIGNMENT</span>
          <span className={`num-xl tnum t-${t.tone}`}>{thesis.alignment_pct}<span className="t-fg3" style={{ fontSize: 12 }}> / 100</span></span>
          <div style={{ width: 160, marginTop: 4 }}>
            <StrengthBar value={thesis.alignment_pct} tone={t.tone} height={5} segments={10}/>
          </div>
        </div>
        <div className="vr"/>
        <div className="col gap-2" style={{ minWidth: 180 }}>
          <span className="label">FRACTAL</span>
          <span className="num-xl tnum t-overlap">{thesis.fractal_pct}<span className="t-fg3" style={{ fontSize: 12 }}> / 100</span></span>
          <div style={{ width: 160, marginTop: 4 }}>
            <StrengthBar value={thesis.fractal_pct} tone="overlap" height={5} segments={10}/>
          </div>
        </div>
        <div className="vr"/>
        <div className="col flex-1 gap-2">
          <span className="label">EXPECTATION</span>
          <span className="t-fg1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, lineHeight: 1.55 }}>{thesis.expectation}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Inline shared helpers ─────────────────────────────────── */
interface KZ { id: string; label: string; startH: number; endH: number; tone: Tone; }
const KILLZONES: KZ[] = [
  { id: 'asia',    label: 'ASIA',         startH: 20, endH: 24, tone: 'asia'    },
  { id: 'asia-2',  label: 'ASIA',         startH: 0,  endH: 2,  tone: 'asia'    },
  { id: 'london',  label: 'LONDON KZ',    startH: 2,  endH: 5,  tone: 'london'  },
  { id: 'overlap', label: 'L/NY OVERLAP', startH: 8,  endH: 9,  tone: 'overlap' },
  { id: 'ny-am',   label: 'NY AM KZ',     startH: 9,  endH: 11, tone: 'warn'    },
  { id: 'ny-pm',   label: 'NY PM KZ',     startH: 13, endH: 16, tone: 'nypm'    },
];
function activeKZ(h: number): KZ | null {
  for (const k of KILLZONES) {
    const inside = k.endH < k.startH ? (h >= k.startH || h < k.endH) : (h >= k.startH && h < k.endH);
    if (inside) return k;
  }
  return null;
}
function sessionFor(h: number): { id: string; label: string; tone: Tone } {
  if (h >= 2 && h < 8)  return { id: 'london',  label: 'LONDON',       tone: 'london'  };
  if (h >= 8 && h < 11) return { id: 'overlap', label: 'L/NY OVERLAP', tone: 'overlap' };
  if (h >= 11 && h < 17) return { id: 'ny',     label: 'NEW YORK',     tone: 'warn'    };
  if (h >= 20 || h < 2) return { id: 'asia',    label: 'ASIA',         tone: 'asia'    };
  return { id: 'flat', label: 'CLOSED', tone: 'neutral' };
}
function nextTransition(h: number) {
  const transitions = [2, 8, 11, 17, 20];
  let target = transitions.find(t => t > h);
  if (target == null) target = 24 + transitions[0];
  const mt = (target - h) * 60;
  return { m: Math.floor(mt), s: Math.round((mt - Math.floor(mt)) * 60), targetLabel: (target % 24).toString().padStart(2, '0') + ':00 ET' };
}
