import type { MacroLog, MacroRegime, Trend } from '../types/macro'
import { fmtPct, deltaTone, trendTone } from '../lib/confluence'
import { ArrowUpRight, ArrowDownRight, Minus, Zap, AlertTriangle } from 'lucide-react'

interface FuturesCardProps {
  name: string
  ticker: string
  level: number
  delta: number
  fractalD: number
  fractalW: number
  fractalM: number
  regime: MacroRegime
}

function trendDir(v: number): Trend {
  if (v > 0.15) return 'UP'
  if (v < -0.15) return 'DOWN'
  return 'FLAT'
}

function MiniPct({ value }: { value: number }) {
  const t = trendDir(value)
  const Icon = t === 'UP' ? ArrowUpRight : t === 'DOWN' ? ArrowDownRight : Minus
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold tabular-nums ${trendTone(t)}`}>
      <Icon className="w-3 h-3" />
      {fmtPct(value)}
    </span>
  )
}

function FuturesCard({ name, ticker, level, delta, fractalD, fractalW, fractalM, regime }: FuturesCardProps) {
  const isBullish = delta > 0.3
  const isBearish = delta < -0.3
  const bias = isBullish ? 'ALCISTA' : isBearish ? 'BAJISTA' : 'NEUTRAL'

  const regimeAligned =
    (regime === 'RISK_ON' && isBullish) ||
    (regime === 'RISK_OFF' && isBearish)

  const tone = isBullish
    ? { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500',
        glow: 'shadow-[0_0_38px_-8px_rgba(52,211,153,0.55)]', ring: 'ring-emerald-500/40' }
    : isBearish
    ? { text: 'text-rose-300',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    dot: 'bg-rose-500',
        glow: 'shadow-[0_0_38px_-8px_rgba(244,63,94,0.55)]', ring: 'ring-rose-500/40' }
    : { text: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-400',
        glow: '', ring: '' }

  const directional = isBullish || isBearish
  const strong    = directional && regimeAligned && Math.abs(delta) > 0.5
  const divergent = directional && !regimeAligned && regime !== 'MIXED'

  const cardCls = strong
    ? `border-2 ${tone.border.replace('/30', '/60')} ${tone.glow} ring-1 ${tone.ring}`
    : divergent
    ? 'border-2 border-amber-500/50 shadow-[0_0_28px_-10px_rgba(251,191,36,0.5)] ring-1 ring-amber-500/30'
    : 'border border-white/[0.08] hover:border-white/[0.15]'

  const DeltaIcon = Math.abs(delta) < 0.1 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight

  const alignmentText =
    regimeAligned
      ? 'Alineado con régimen macro'
      : regime === 'MIXED'
      ? 'Régimen mixto — confirmar dirección'
      : 'Divergente con régimen macro'

  const alignmentColor =
    regimeAligned ? 'text-emerald-400' : regime === 'MIXED' ? 'text-slate-400' : 'text-amber-400'

  const alignmentDot =
    regimeAligned ? 'bg-emerald-400' : regime === 'MIXED' ? 'bg-slate-400' : 'bg-amber-400'

  const action = isBullish
    ? 'Buscar LONGS en retrocesos a zonas de demanda — OB bullish, FVG alcista'
    : isBearish
    ? 'Buscar SHORTS en rebotes a zonas de oferta — OB bearish, FVG bajista'
    : 'Sin sesgo operativo claro — esperar ruptura de rango'

  return (
    <div className={`relative rounded-2xl bg-white/[0.025] p-6 transition-all duration-300 ${cardCls}`}>
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

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-slate-500 uppercase">Futuros</p>
          <h3 className="text-2xl font-black text-white tracking-tight">{name}</h3>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">{ticker}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tone.bg} ${tone.border} border`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          <span className={`text-xs font-bold tracking-wide ${tone.text}`}>{bias}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-4xl font-bold text-white font-mono tabular-nums tracking-tight">
          {level > 0 ? level.toFixed(0) : '—'}
        </span>
        <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${deltaTone(delta)}`}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {fmtPct(delta)}
        </span>
      </div>

      <div className="mb-5 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
        <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-2.5">Fractalidad</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Diario',   value: fractalD },
            { label: 'Semanal',  value: fractalW },
            { label: 'Mensual',  value: fractalM },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-slate-500 uppercase mb-1">{label}</p>
              <MiniPct value={value} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-white/[0.06]">
        <p className="text-xs text-slate-400 leading-relaxed">{action}</p>
        <span className={`flex items-center gap-1.5 text-[11px] ${alignmentColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${alignmentDot}`} />
          {alignmentText}
        </span>
      </div>
    </div>
  )
}

export function FuturesCards({ data }: { data: MacroLog }) {
  const nq = data.fractal?.nasdaq
  const es = data.fractal?.sp500

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FuturesCard
        name="NASDAQ"
        ticker="NQ Futures"
        level={nq?.level ?? 0}
        delta={data.nasdaq_delta}
        fractalD={nq?.d ?? 0}
        fractalW={nq?.w ?? 0}
        fractalM={nq?.m ?? 0}
        regime={data.macro_regime}
      />
      <FuturesCard
        name="S&P 500"
        ticker="ES Futures"
        level={es?.level ?? 0}
        delta={data.sp500_delta}
        fractalD={es?.d ?? 0}
        fractalW={es?.w ?? 0}
        fractalM={es?.m ?? 0}
        regime={data.macro_regime}
      />
    </div>
  )
}
