import type { MacroLog } from '../types/macro'
import { REGIME_STYLE, fmtPct, fmtBps, deltaTone } from '../lib/confluence'

interface SignalRowProps {
  label: string
  value: string
  delta?: string
  deltaClass?: string
}

function SignalRow({ label, value, delta, deltaClass }: SignalRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="flex items-baseline gap-2 font-mono">
        <span className="text-sm text-slate-200 tabular-nums">{value}</span>
        {delta && (
          <span className={`text-xs font-semibold tabular-nums ${deltaClass}`}>
            {delta}
          </span>
        )}
      </span>
    </div>
  )
}

export function MacroBanner({ data }: { data: MacroLog }) {
  const cfg = REGIME_STYLE[data.macro_regime]

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} p-6 md:p-8`}>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-5 shrink-0">
          <div className={`relative w-20 h-20 rounded-full ${cfg.dot} ring-8 ${cfg.ring} shadow-[0_0_60px] flex items-center justify-center`}>
            <div className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping opacity-20`} />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] text-slate-500 uppercase">Macro Regime</p>
            <p className={`text-4xl font-black tracking-tight ${cfg.text} leading-tight`}>{cfg.label}</p>
            <p className="text-sm text-slate-400">{cfg.sub}</p>
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-white/10" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
          <SignalRow
            label="DXY"
            value={data.dxy_level.toFixed(3)}
            delta={fmtPct(data.dxy_delta)}
            deltaClass={deltaTone(data.dxy_delta)}
          />
          <SignalRow
            label="US 10Y"
            value={`${data.us10y_level.toFixed(2)}%`}
            delta={fmtBps(data.us10y_bps_delta)}
            deltaClass={deltaTone(data.us10y_bps_delta)}
          />
          <SignalRow
            label="VIX"
            value={data.vix_level.toFixed(2)}
            delta={`${data.vix_pts_delta > 0 ? '+' : ''}${data.vix_pts_delta.toFixed(2)} pts`}
            deltaClass={deltaTone(data.vix_pts_delta, 0.01, true)}
          />
          <SignalRow
            label="Spread 10Y–2Y"
            value={`${data.spread_10y_2y.toFixed(2)}%`}
          />
        </div>
      </div>
    </div>
  )
}
