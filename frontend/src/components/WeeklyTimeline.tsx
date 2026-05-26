/* ───────────────────────────────────────────────────────────────
   src/components/WeeklyTimeline.tsx
   Always-on visual at the top of every tab. 1s live tick.
─────────────────────────────────────────────────────────────── */

import * as React from 'react';
import type { UpcomingEvent } from '../types/macro';
import { IMPORTANCE_STYLE, type Tone } from '../lib/confluence.style';
import { Ico, Pill, useTicker, getETParts, fmtTZHM, ET_TZ, BA_TZ } from './_primitives';

const { useState } = React;

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
function bandFor(h: number): string | null {
  if (h >= 2 && h < 5)  return 'var(--london)';
  if (h >= 8 && h < 9)  return 'var(--overlap)';
  if (h >= 9 && h < 11) return 'var(--warn)';
  if (h >= 13 && h < 16) return 'var(--nypm)';
  if (h >= 20 || h < 2) return 'var(--asia)';
  return null;
}
function nextTransition(h: number) {
  const transitions = [2, 8, 11, 17, 20];
  let target = transitions.find(t => t > h);
  if (target == null) target = 24 + transitions[0];
  const mt = (target - h) * 60;
  return { m: Math.floor(mt), s: Math.round((mt - Math.floor(mt)) * 60), targetLabel: (target % 24).toString().padStart(2, '0') + ':00 ET' };
}

export interface WeeklyTimelineProps { events: UpcomingEvent[] | null; }

export function WeeklyTimeline({ events }: WeeklyTimelineProps) {
  const now = useTicker(1000);
  const et = getETParts(now);
  // Rolling 7-day window starting from today (in ET). This puts upcoming
  // sessions in the foreground — today is row 0, then +1d, +2d, … +6d.
  const ALL_DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const todayIdx0 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(et.weekday);
  const days = Array.from({ length: 7 }, (_, i) => ALL_DAYS[(todayIdx0 + i) % 7]);
  const dateKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10);
  });
  const dayDeltas = ['HOY', '+1d', '+2d', '+3d', '+4d', '+5d', '+6d'];
  const [hover, setHover] = useState<{ di: number; hf: number } | null>(null);

  return (
    <div className="panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="panel-head">
        <div className="left"><span className="dot" style={{ background: 'var(--bull)' }}/>WEEKLY TIMELINE / SESSIONS · KILLZONES · EVENTS</div>
        <div className="right"><Pill tone="bull" dot icon={<Ico.flame/>}>NOW · {fmtTZHM(now, ET_TZ)} ET / {fmtTZHM(now, BA_TZ)} BA</Pill></div>
      </div>

      <div className="row">
        <div className="flex-1 col" style={{ borderRight: '1px solid var(--line-2)' }}>
          <div className="row" style={{ borderBottom: '1px solid var(--line-2)', background: 'var(--bg-1)', position: 'relative', overflow: 'visible' }}>
            <div style={{ width: 60, padding: '8px 8px', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', letterSpacing: '0.2em', borderRight: '1px solid var(--line-2)' }}>ET ↘</div>
            <div className="flex-1 row crosshair" style={{ position: 'relative', overflow: 'visible' }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const isMajor = i % 6 === 0;
                const isAdjacent = Math.abs(i - et.hourFloat) < 0.5;
                return (
                  <div key={i} style={{
                    flex: 1, padding: '8px 0', textAlign: 'center',
                    borderRight: i < 23 ? '1px solid var(--line-1)' : 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: isMajor ? 11 : 10,
                    fontWeight: isMajor ? 800 : 600,
                    color: isAdjacent ? 'var(--bull)' : isMajor ? 'var(--fg-1)' : 'var(--fg-3)',
                    letterSpacing: '0.08em',
                  }}>
                    {String(i).padStart(2, '0')}
                  </div>
                );
              })}
              {/* NOW chip docked above the hour header */}
              {(() => {
                const left = (et.hourFloat / 24) * 100;
                const flip = left < 8 ? 'flip-right' : left > 92 ? 'flip-left' : '';
                return (
                  <div
                    className={`now-chip now-pulse ${flip}`}
                    style={{ left: `${left}%`, top: -28 }}
                  >
                    NOW · {fmtTZHM(now, ET_TZ)} ET
                  </div>
                );
              })()}
            </div>
          </div>

          {days.map((dLabel, di) => {
            const isToday = di === 0;
            return (
              <div key={di} className="row" style={{ borderBottom: di < 6 ? '1px solid var(--line-2)' : 'none', background: isToday ? 'rgba(52,211,153,0.025)' : 'transparent' }}>
                <div style={{
                  width: 60, padding: '8px 8px', borderRight: '1px solid var(--line-2)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: isToday ? 11 : 10,
                  fontWeight: isToday ? 800 : 700,
                  letterSpacing: '0.2em',
                  color: isToday ? 'var(--bull)' : 'var(--fg-2)',
                  background: isToday ? 'color-mix(in oklab, var(--bull) 8%, transparent)' : 'transparent',
                }}>
                  {dLabel}
                  {isToday ? (
                    <div style={{
                      fontSize: 8.5, marginTop: 3, padding: '1px 4px',
                      background: 'var(--bull)', color: 'var(--bg-0)',
                      fontWeight: 800, letterSpacing: '0.18em',
                      display: 'inline-block', borderRadius: 1,
                    }}>HOY</div>
                  ) : (
                    <div style={{
                      fontSize: 9, marginTop: 3, color: 'var(--fg-3)',
                      letterSpacing: '0.12em', fontWeight: 600,
                    }}>{dayDeltas[di]}</div>
                  )}
                </div>
                <div className="flex-1 row crosshair" style={{ position: 'relative', height: 44 }}
                  onMouseMove={(e) => {
                    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    setHover({ di, hf: ((e.clientX - r.left) / r.width) * 24 });
                  }}
                  onMouseLeave={() => setHover(null)}>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const color = bandFor(h);
                    return (
                      <div key={h} style={{ flex: 1, height: '100%', borderRight: h < 23 ? '1px solid var(--line-1)' : 'none', background: color ? `linear-gradient(180deg, color-mix(in oklab, ${color} 18%, transparent), color-mix(in oklab, ${color} 8%, transparent))` : 'transparent', position: 'relative' }}>
                        {color && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: .55 }}/>}
                      </div>
                    );
                  })}
                  {(events || []).filter(ev => ev.date === dateKeys[di]).map((ev, i) => {
                    const [hh, mm] = (ev.time_utc || '00:00').split(':').map(Number);
                    const etH = ((hh - 5 + 24) % 24) + mm / 60;
                    const left = (etH / 24) * 100;
                    const tone: Tone = ev.importance === 'high' ? 'bear' : ev.importance === 'medium' ? 'warn' : 'neutral';
                    return (
                      <div key={i} title={`${ev.event} · ${ev.time_utc}Z`}
                        style={{ position: 'absolute', top: 4, bottom: 4, left: `${left}%`, width: 3, background: `var(--${tone})`, boxShadow: `0 0 12px var(--${tone}-glow)`, zIndex: 2 }}>
                        <div style={{ position: 'absolute', top: -3, left: -2, width: 7, height: 7, background: `var(--${tone})`, border: '1px solid var(--bg-0)' }}/>
                      </div>
                    );
                  })}
                  {/* Past-hours mask on today's row: dims the hours that
                      already happened so the future (right of NOW) dominates. */}
                  {isToday && et.hourFloat > 0 && (
                    <div className="pointer-none" style={{
                      position: 'absolute', top: 0, bottom: 0, left: 0,
                      width: `${(et.hourFloat / 24) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(7,8,10,0.7), rgba(7,8,10,0.55))',
                      zIndex: 1,
                    }}/>
                  )}
                  {/* Sub-radar column: faded NOW line across every future-day row
                      so the eye can trace the same hour-column across the week. */}
                  {!isToday && (
                    <div
                      className="now-col"
                      style={{ left: `calc(${(et.hourFloat / 24) * 100}% - 1px)` }}
                    />
                  )}
                  {/* Bright NOW marker on today's row, with top + bottom arrows. */}
                  {isToday && (
                    <div
                      className="now-col today now-pulse"
                      style={{ left: `calc(${(et.hourFloat / 24) * 100}% - 1.5px)` }}
                    >
                      <span className="now-arrow"/>
                      <span className="now-arrow bottom"/>
                    </div>
                  )}
                  {hover && hover.di === di && (
                    <div className="pointer-none" style={{ position: 'absolute', top: 0, bottom: 0, left: `${(hover.hf / 24) * 100}%`, width: 1, background: 'rgba(255,255,255,0.45)', zIndex: 2 }}/>
                  )}
                </div>
              </div>
            );
          })}

          <div className="row gap-3 items-center px-4" style={{ padding: '8px 16px', borderTop: '1px solid var(--line-2)', background: 'var(--bg-1)', flexWrap: 'wrap' }}>
            <LegendChip color="var(--asia)"    label="ASIA 20–02"/>
            <LegendChip color="var(--london)"  label="LONDON KZ 02–05"/>
            <LegendChip color="var(--overlap)" label="L/NY OVERLAP 08–09"/>
            <LegendChip color="var(--warn)"    label="NY AM KZ 09–11"/>
            <LegendChip color="var(--nypm)"    label="NY PM KZ 13–16"/>
            <span style={{ flex: 1 }}/>
            <LegendChip color="var(--bull)"    label="NOW" line/>
            <LegendChip color="var(--bear)"    label="HIGH IMPACT EVENT" diamond/>
          </div>
        </div>

        <TodayPanel hourFloat={et.hourFloat} weekday={et.weekday} events={events} hover={hover} now={now}/>
      </div>
    </div>
  );
}

function LegendChip({ color, label, line, diamond }: { color: string; label: string; line?: boolean; diamond?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: 'var(--fg-2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
      {line   ? <span style={{ width: 12, height: 2, background: color, boxShadow: `0 0 8px ${color}` }}/>
       : diamond ? <span style={{ width: 7, height: 7, background: color, transform: 'rotate(45deg)' }}/>
       : <span style={{ width: 10, height: 10, background: color, opacity: .65 }}/>}
      {label}
    </span>
  );
}

function TodayPanel({ hourFloat, weekday, events, hover, now }: { hourFloat: number; weekday: string; events: UpcomingEvent[] | null; hover: { di: number; hf: number } | null; now: Date }) {
  const todayKey = new Date().toISOString().slice(0,10);
  const todays = (events || []).filter(ev => ev.date === todayKey);
  const kz = activeKZ(hourFloat);
  const nt = nextTransition(hourFloat);
  const keyHours = [
    { h: 2, label: 'LONDON OPEN', tone: 'london' as Tone },
    { h: 8, label: 'NY PRE', tone: 'overlap' as Tone },
    { h: 9.5, label: 'NY OPEN', tone: 'warn' as Tone },
    { h: 13, label: 'NY PM', tone: 'nypm' as Tone },
    { h: 16, label: 'NY CLOSE', tone: 'neutral' as Tone },
  ];
  const hoverHM = hover ? `${Math.floor(hover.hf).toString().padStart(2,'0')}:${Math.floor((hover.hf % 1) * 60).toString().padStart(2,'0')}` : null;

  return (
    <div className="col" style={{ width: 360, background: 'var(--bg-1)' }}>
      <div className="panel-head" style={{ background: 'var(--bg-2)' }}>
        <div className="left"><span className="dot" style={{ background: kz ? `var(--${kz.tone})` : 'var(--fg-3)' }}/>TODAY · {weekday.toUpperCase()}</div>
        <div className="right">{fmtTZHM(now, ET_TZ)} ET</div>
      </div>

      <div className="col gap-2 p-3">
        <div className="row items-center gap-2" style={{ padding: '10px 12px', border: '1px solid ' + (kz ? `var(--${kz.tone}-line)` : 'var(--line-2)'), background: kz ? `var(--${kz.tone}-bg)` : 'var(--bg-2)' }}>
          <Ico.flame style={{ color: kz ? `var(--${kz.tone})` : 'var(--fg-3)' }} className={kz ? 'pulse' : ''}/>
          <div className="col gap-1 flex-1">
            <span className="label" style={{ color: kz ? `var(--${kz.tone})` : 'var(--fg-3)' }}>{kz ? 'KZ ACTIVE' : 'NO ACTIVE KZ'}</span>
            <span className="num-md tnum t-fg0">{kz ? kz.label : 'FLAT WINDOW'}</span>
          </div>
          <div className="col gap-1 items-end">
            <span className="label">NEXT</span>
            <span className="num-sm tnum t-fg1">{String(nt.m).padStart(2,'0')}:{String(nt.s).padStart(2,'0')}</span>
          </div>
        </div>

        <div className="col" style={{ border: '1px solid var(--line-2)' }}>
          <div className="panel-head" style={{ minHeight: 28 }}>
            <div className="left"><span className="dot"/>KEY HOURS · ET</div>
          </div>
          {keyHours.map((k, i) => {
            const passed = hourFloat > k.h;
            const active = Math.abs(hourFloat - k.h) < 0.5;
            return (
              <div key={i} className="cell" style={{ padding: '6px 12px' }}>
                <div className="row items-center gap-2">
                  <span style={{ width: 6, height: 6, background: `var(--${k.tone})`, opacity: active ? 1 : passed ? 0.4 : 0.7 }}/>
                  <span className="label-bright" style={{ fontSize: 10, color: active ? `var(--${k.tone})` : passed ? 'var(--fg-3)' : 'var(--fg-1)' }}>{k.label}</span>
                </div>
                <span className="num-sm tnum" style={{ color: active ? `var(--${k.tone})` : passed ? 'var(--fg-3)' : 'var(--fg-1)' }}>
                  {`${Math.floor(k.h).toString().padStart(2,'0')}:${((k.h % 1) * 60).toString().padStart(2, '0')}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="col" style={{ border: '1px solid var(--line-2)' }}>
          <div className="panel-head" style={{ minHeight: 28 }}>
            <div className="left"><span className="dot" style={{ background: 'var(--bear)' }}/>EVENTS TODAY · {todays.length}</div>
            <div className="right">VOL WINDOW</div>
          </div>
          {todays.length === 0 && <div className="p-3 t-fg3" style={{ fontSize: 11, textAlign: 'center' }}>No events scheduled.</div>}
          {todays.map((ev, i) => {
            const tone: Tone = ev.importance === 'high' ? 'bear' : ev.importance === 'medium' ? 'warn' : 'neutral';
            const [hh, mm] = (ev.time_utc || '00:00').split(':').map(Number);
            const etH = ((hh - 5 + 24) % 24);
            return (
              <div key={i} className="cell" style={{ padding: '8px 12px' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <div className="row items-center gap-2">
                    <Pill tone={tone}>{IMPORTANCE_STYLE[ev.importance].label}</Pill>
                    <span className="t-fg3" style={{ fontSize: 10 }}>{ev.currency}</span>
                  </div>
                  <span className="t-fg1" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>{ev.event}</span>
                </div>
                <div className="col items-end gap-1">
                  <span className="num-sm tnum t-fg0">{String(etH).padStart(2,'0')}:{String(mm).padStart(2,'0')}</span>
                  <span className="t-fg4" style={{ fontSize: 9, letterSpacing: '0.1em' }}>ET</span>
                </div>
              </div>
            );
          })}
        </div>

        {hover && (
          <div className="row items-center justify-between" style={{ padding: '6px 12px', border: '1px dashed var(--line-3)', color: 'var(--fg-2)', fontSize: 10, letterSpacing: '0.16em' }}>
            <span>HOVER → ET</span>
            <span className="t-fg0 tnum num-sm">{hoverHM}</span>
          </div>
        )}
      </div>
    </div>
  );
}
