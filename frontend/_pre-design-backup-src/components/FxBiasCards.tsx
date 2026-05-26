import type { MacroLog, FractalRow } from '../types/macro'
import { fmtPct, fmtDelta, deltaTone, trendTone } from '../lib/confluence'
import { ArrowUpRight, ArrowDownRight, Minus, Zap, AlertTriangle } from 'lucide-react'

interface FxCardProps {
  pair: string
  level: number
  delta: number
  dxyDelta: number
  fractalRow?: FractalRow
}

function MiniTrend({ value, trend, unit }: {
  value: number
  trend: FractalRow['trends']['d']
  unit: FractalRow['unit']
}) {
  const Icon = trend === 'UP' ? ArrowUpRight : trend === 'DOWN' ? ArrowDownRight : Minus
  return (
    <span className={`inline-flex items-center justify-center gap-0.5 text-xs font-mono font-semibold tabular-nums ${trendTone(trend)}`}>
      <Icon className="w-3 h-3" />
      {fmtDelta(value, unit)}
    </span>
  )
}

function FxBiasCard({ pair, level, delta, dxyDelta, fractalRow }: FxCardProps) {
  const isBearish = delta < -0.05
  const isBullish = delta >  0.05
  const aligned   = (delta < 0 && dxyDelta > 0) || (delta > 0 && dxyDelta < 0)
  const fractalAligned = fractalRow?.aligned ?? false
  const directional = isBullish || isBearish
  // Strong = clear directional bias + DXY aligned + fractalmente alineado en D/W/M
  const strong   = directional && aligned && fractalAligned && Math.abs(delta) > 0.15
  // Divergente = sesgo claro pero contrario al DXY (alerta de trampa)
  const divergent = directional && !aligned

  const bias = isBearish ? 'BEARISH' : isBullish ? 'BULLISH' : 'NEUTRAL'
  const tone = isBearish
    ? { text: 'text-rose-300',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    dot: 'bg-rose-500',
        glow: 'shadow-[0_0_38px_-8px_rgba(244,63,94,0.55)]', ring: 'ring-rose-500/40' }
    : isBullish
    ? { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500',
        glow: 'shadow-[0_0_38px_-8px_rgba(52,211,153,0.55)]', ring: 'ring-emerald-500/40' }
    : { text: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-400',
        glow: '', ring: '' }

  const cardCls = strong
    ? `border-2 ${tone.border.replace('/30', '/60')} ${tone.glow} ring-1 ${tone.ring}`
    : divergent
    ? 'border-2 border-amber-500/50 shadow-[0_0_28px_-10px_rgba(251,191,36,0.5)] ring-1 ring-amber-500/30'
    : 'border border-white/[0.08] hover:border-white/[0.15]'

  const action = isBearish
    ? 'Buscar SHORTS en pullbacks hacia zonas de oferta SMC (FVG bearish, OB)'
    : isBullish
    ? 'Buscar LONGS en retrocesos a zonas de demanda SMC (FVG bullish, OB)'
    : 'Sin sesgo claro — esperar confirmación direccional'

  const DeltaIcon = Math.abs(delta) < 0.01 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className={`relative rounded-2xl bg-white/[0.025] p-6 transition-all duration-300 ${cardCls}`}>
      {/* Strong signal ribbon */}
      {strong && (
        <div className={`absolute -top-2.5 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full ${tone.bg} ${tone.border} border-2 ${tone.text} text-[10px] font-black tracking-widest uppercase shadow-[0_0_14px_-2px_currentColor] animate-pulse`}>
          <Zap className="w-3 h-3" fill="currentColor" />
          SEÑAL FUERTE
        </div>
      )}
      {divergent && !strong && (
        <div className="absolute -top-2.5 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border-2 border-amber-500/60 text-amber-200 text-[10px] font-black tracking-widest uppercase shadow-[0_0_12px_-3px_rgba(251,191,36,0.7)]">
          <AlertTriangle className="w-3 h-3" />
          DIVERGENTE
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-slate-500 uppercase">FX Major</p>
          <h3 className="text-2xl font-black text-white tracking-tight">{pair}</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tone.bg} ${tone.border} border`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          <span className={`text-xs font-bold tracking-wide ${tone.text}`}>{bias}</span>
        </div>
      </div>

      {/* Level + Delta */}
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-4xl font-bold text-white font-mono tabular-nums tracking-tight">
          {level.toFixed(5)}
        </span>
        <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${deltaTone(delta)}`}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {fmtPct(delta)}
        </span>
      </div>

      {/* Fractal D / W / M */}
      {fractalRow && (
        <div className="mb-5 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-2.5">Fractalidad</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(['d', 'w', 'm'] as const).map(tf => (
              <div key={tf}>
                <p className="text-[9px] text-slate-500 uppercase mb-1">
                  {tf === 'd' ? 'Diario' : tf === 'w' ? 'Semanal' : 'Mensual'}
                </p>
                <MiniTrend value={fractalRow[tf]} trend={fractalRow.trends[tf]} unit={fractalRow.unit} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action + DXY alignment */}
      <div className="space-y-2 pt-4 border-t border-white/[0.06]">
        <p className="text-xs text-slate-400 leading-relaxed">{action}</p>
        <span className={`flex items-center gap-1.5 text-[11px] ${aligned ? 'text-emerald-400' : 'text-amber-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${aligned ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {aligned ? 'Alineado con DXY' : 'Divergente con DXY'}
        </span>
      </div>
    </div>
  )
}

export function FxBiasCards({ data }: { data: MacroLog }) {
  const rows = data.thesis?.fractal_rows ?? []
  const eurRow = rows.find(r => r.key === 'eurusd')
  const gbpRow = rows.find(r => r.key === 'gbpusd')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FxBiasCard
        pair="EUR/USD"
        level={data.eurusd_level}
        delta={data.eurusd_delta}
        dxyDelta={data.dxy_delta}
        fractalRow={eurRow}
      />
      <FxBiasCard
        pair="GBP/USD"
        level={data.gbpusd_level}
        delta={data.gbpusd_delta}
        dxyDelta={data.dxy_delta}
        fractalRow={gbpRow}
      />
    </div>
  )
}
