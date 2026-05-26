/* src/components/SessionMeter.tsx */
import type { UpcomingEvent } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { Pill, useTicker, getETParts, fmtTZHM, ET_TZ } from './_primitives';

export interface SessionMeterProps { events: UpcomingEvent[] | null; }

export function SessionMeter({ events }: SessionMeterProps) {
  const now = useTicker(30 * 1000);
  const et = getETParts(now);
  const h = et.hourFloat;
  const todayKey = new Date().toISOString().slice(0,10);

  const sessionsDef: { id: string; label: string; startH: number; endH: number; tone: Tone }[] = [
    { id: 'london', label: 'LONDON',   startH: 3,   endH: 11.5, tone: 'london' },
    { id: 'ny',     label: 'NEW YORK', startH: 9.5, endH: 16,   tone: 'warn'   },
  ];

  const within = (s: typeof sessionsDef[number]) => h >= s.startH && h < s.endH;
  const mTo = (target: number) => Math.round((target - h) * 60);

  const sessions = sessionsDef.map(s => {
    const status: 'OPEN' | 'PRE' | 'CLOSED' = within(s) ? 'OPEN' : h < s.startH ? 'PRE' : 'CLOSED';
    return {
      ...s, status,
      minsToOpen: h < s.startH ? mTo(s.startH) : 0,
      minsToClose: within(s) ? mTo(s.endH) : 0,
      progress: within(s) ? Math.min(100, ((h - s.startH) / (s.endH - s.startH)) * 100) : status === 'CLOSED' ? 100 : 0,
    };
  });

  const todays = (events || []).filter(ev => ev.date === todayKey);
  const high = todays.filter(e => e.importance === 'high').length;
  const med  = todays.filter(e => e.importance === 'medium').length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bull)' }}/>SESSION METER · LIVE</div>
        <div className="right">{fmtTZHM(now, ET_TZ)} ET</div>
      </div>
      <div className="row">
        {sessions.map((s) => (
          <div key={s.id} className="col flex-1 p-4 gap-3" style={{ borderRight: '1px solid var(--line-2)' }}>
            <div className="row items-center justify-between">
              <div className="row items-center gap-2">
                <span style={{ width: 10, height: 10, background: `var(--${s.tone})`, boxShadow: s.status === 'OPEN' ? `0 0 16px var(--${s.tone})` : 'none', opacity: s.status === 'CLOSED' ? 0.3 : 1 }} className={s.status === 'OPEN' ? 'pulse' : ''}/>
                <span className="t-fg0" style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, letterSpacing: '0.16em' }}>{s.label}</span>
              </div>
              <Pill tone={s.status === 'OPEN' ? s.tone : 'neutral'}>{s.status}</Pill>
            </div>
            <div className="col gap-2">
              <div className="row items-center justify-between">
                <span className="label">{s.status === 'OPEN' ? 'CLOSES IN' : s.status === 'PRE' ? 'OPENS IN' : 'NEXT OPEN'}</span>
                <span className="num-md tnum t-fg0">
                  {s.status === 'OPEN' ? `${Math.floor(s.minsToClose/60)}H ${s.minsToClose % 60}M` :
                   s.status === 'PRE'  ? `${Math.floor(s.minsToOpen/60)}H ${s.minsToOpen % 60}M` : '—'}
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: 'var(--bg-3)', border: '1px solid var(--line-2)' }}>
                <div style={{ width: `${s.progress}%`, height: '100%', background: s.status === 'OPEN' ? `var(--${s.tone})` : 'var(--line-3)', boxShadow: s.status === 'OPEN' ? `0 0 12px var(--${s.tone}-glow)` : 'none' }}/>
              </div>
              <div className="row justify-between t-fg4" style={{ fontSize: 9, letterSpacing: '0.12em' }}>
                <span>{`${Math.floor(s.startH).toString().padStart(2,'0')}:${((s.startH%1)*60).toString().padStart(2,'0')} ET`}</span>
                <span>{`${Math.floor(s.endH).toString().padStart(2,'0')}:${((s.endH%1)*60).toString().padStart(2,'0')} ET`}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="col p-4 gap-2" style={{ minWidth: 200 }}>
          <span className="label">EVENTS TODAY</span>
          <div className="row gap-2 items-baseline">
            <span className="num-hero tnum t-fg0">{todays.length}</span>
            <span className="t-fg3" style={{ fontSize: 11 }}>scheduled</span>
          </div>
          <div className="row gap-2" style={{ marginTop: 4 }}>
            <Pill tone="bear">HIGH {high}</Pill>
            <Pill tone="warn">MED {med}</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}
