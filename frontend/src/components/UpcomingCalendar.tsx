/* src/components/UpcomingCalendar.tsx */
import * as React from 'react';
import type { UpcomingEvent } from '../types/macro';
import type { Tone } from '../lib/confluence.style';
import { IMPORTANCE_STYLE } from '../lib/confluence.style';
import { Ico, Pill } from './_primitives';

export interface UpcomingCalendarProps { events: UpcomingEvent[] | null; }

export function UpcomingCalendar({ events }: UpcomingCalendarProps) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const grouped = React.useMemo(() => {
    const m: Record<string, UpcomingEvent[]> = {};
    (events || []).forEach(ev => { (m[ev.date] = m[ev.date] || []).push(ev); });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b));
  }, [events]);
  return (
    <div className="panel" style={{ width: 420 }}>
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bear)' }}/>UPCOMING CALENDAR</div>
        <div className="right">{(events || []).length} EVENTS</div>
      </div>
      <div className="col">
        {grouped.map(([date, evs]) => {
          const today = new Date(); today.setHours(0,0,0,0);
          const dDate = new Date(date); dDate.setHours(0,0,0,0);
          const dayDiff = Math.round((dDate.getTime() - today.getTime()) / 86400e3);
          const dayLabel = dayDiff === 0 ? 'TODAY' : dayDiff === 1 ? 'TOMORROW' : dayDiff === -1 ? 'YESTERDAY' : `D+${dayDiff}`;
          const tone: Tone = dayDiff === 0 ? 'bull' : dayDiff === 1 ? 'warn' : 'neutral';
          return (
            <div key={date}>
              <div className="row items-center justify-between" style={{ padding: '8px 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line-2)', borderTop: '1px solid var(--line-2)' }}>
                <div className="row gap-2 items-center">
                  <span style={{ width: 7, height: 7, background: `var(--${tone})` }}/>
                  <span className="label" style={{ color: `var(--${tone})` }}>{dayLabel}</span>
                  <span className="t-fg3" style={{ fontSize: 11 }}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}</span>
                </div>
                <span className="t-fg4" style={{ fontSize: 10 }}>{evs.length}</span>
              </div>
              {evs.map((ev, i) => {
                const itone: Tone = ev.importance === 'high' ? 'bear' : ev.importance === 'medium' ? 'warn' : 'neutral';
                const [hh, mm] = (ev.time_utc || '00:00').split(':').map(Number);
                const etH = ((hh - 5 + 24) % 24);
                const key = date + '-' + i;
                const isExp = expanded === key;
                return (
                  <div key={key} className="col" style={{ borderBottom: '1px solid var(--line-2)' }}>
                    <button onClick={() => setExpanded(isExp ? null : key)} className="row items-center justify-between hoverable" style={{ padding: '10px 12px', textAlign: 'left', width: '100%' }}>
                      <div className="col gap-1 flex-1" style={{ minWidth: 0 }}>
                        <div className="row gap-2 items-center">
                          <Pill tone={itone}>{IMPORTANCE_STYLE[ev.importance].label}</Pill>
                          <span className="t-fg3" style={{ fontSize: 10, letterSpacing: '0.1em' }}>{ev.currency}</span>
                        </div>
                        <span className="t-fg1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 500 }}>{ev.event}</span>
                      </div>
                      <div className="col items-end gap-1">
                        <span className="num-sm tnum t-fg0">{String(etH).padStart(2,'0')}:{String(mm).padStart(2,'0')}</span>
                        <Ico.chevD className="t-fg3" style={{ transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}/>
                      </div>
                    </button>
                    {isExp && (
                      <div className="col gap-2" style={{ padding: '10px 16px 14px', background: 'var(--bg-2)' }}>
                        <div className="row gap-2">
                          <div className="col flex-1 gap-1" style={{ padding: '8px 10px', background: 'var(--bull-bg)', border: '1px solid var(--bull-line)' }}>
                            <span className="label" style={{ color: 'var(--bull)' }}>BULLISH CASE</span>
                            <span className="t-fg1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, lineHeight: 1.4 }}>Above-consensus surprises USD/yields. Expect risk pressure, equities weak.</span>
                          </div>
                          <div className="col flex-1 gap-1" style={{ padding: '8px 10px', background: 'var(--bear-bg)', border: '1px solid var(--bear-line)' }}>
                            <span className="label" style={{ color: 'var(--bear)' }}>BEARISH CASE</span>
                            <span className="t-fg1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, lineHeight: 1.4 }}>Miss / dovish print → USD softens, equities relief, yields lower.</span>
                          </div>
                        </div>
                        <span className="t-fg3" style={{ fontFamily: 'Inter, sans-serif', fontSize: 10.5, letterSpacing: '0.04em' }}>
                          Session window: {ev.session ? ev.session.toUpperCase() : '—'} · Volatility expected ±20–60 bps depending on surprise.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
