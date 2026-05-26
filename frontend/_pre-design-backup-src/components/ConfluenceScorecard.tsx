import type { Thesis } from '../types/macro'
import { VECTOR_STATUS_STYLE } from '../lib/confluence'
import { CheckCircle2, XCircle, CircleDot, Zap, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STATUS_ICON: Record<string, LucideIcon> = {
  CONFIRMS: CheckCircle2,
  DIVERGES: XCircle,
  NEUTRAL:  CircleDot,
}

export function ConfluenceScorecard({ thesis }: { thesis: Thesis }) {
  const { alignment_pct, vectors } = thesis

  const scoreColor =
    alignment_pct >= 75 ? 'text-emerald-400' :
    alignment_pct >= 50 ? 'text-amber-400'   :
                          'text-rose-400'

  const scoreBg =
    alignment_pct >= 75 ? 'from-emerald-500/30 to-emerald-500/0' :
    alignment_pct >= 50 ? 'from-amber-500/30 to-amber-500/0'     :
                          'from-rose-500/30 to-rose-500/0'

  const veryHigh = alignment_pct >= 75
  const veryLow  = alignment_pct <= 30

  const cardCls = veryHigh
    ? 'border-2 border-emerald-500/50 shadow-[0_0_42px_-10px_rgba(52,211,153,0.55)] ring-1 ring-emerald-500/30'
    : veryLow
    ? 'border-2 border-rose-500/50 shadow-[0_0_42px_-10px_rgba(244,63,94,0.5)] ring-1 ring-rose-500/30'
    : 'border border-white/[0.08]'

  return (
    <div className={`relative rounded-2xl bg-white/[0.025] p-6 transition-all duration-300 ${cardCls}`}>
      {veryHigh && (
        <div className="absolute -top-2.5 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border-2 border-emerald-500/60 text-emerald-200 text-[10px] font-black tracking-widest uppercase shadow-[0_0_14px_-2px_rgba(52,211,153,0.8)] animate-pulse">
          <Zap className="w-3 h-3" fill="currentColor" />
          CONFLUENCIA ALTA
        </div>
      )}
      {veryLow && (
        <div className="absolute -top-2.5 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border-2 border-rose-500/60 text-rose-200 text-[10px] font-black tracking-widest uppercase shadow-[0_0_12px_-3px_rgba(244,63,94,0.7)] animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          SIN ALINEACIÓN
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
        <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${scoreBg} border border-white/10 flex flex-col items-center justify-center shrink-0`}>
          <span className={`text-4xl font-black font-mono tabular-nums ${scoreColor}`}>{alignment_pct}</span>
          <span className="text-[10px] font-semibold text-slate-500 tracking-wider">/ 100</span>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-[0.25em] text-slate-500 uppercase mb-1">
            Alignment Score
          </p>
          <p className="text-lg font-bold text-white leading-tight mb-2">
            {alignment_pct >= 75 ? 'Alineación fuerte entre activos'
            : alignment_pct >= 50 ? 'Alineación parcial — confluencia moderada'
            : 'Sin alineación clara — señales contradictorias'}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Mide cuántos activos confirman el régimen macro vigente.
            Score alto = setup operativo limpio. Score bajo = esperar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vectors.map(v => {
          const style = VECTOR_STATUS_STYLE[v.status]
          const Icon = STATUS_ICON[v.status] ?? CircleDot
          return (
            <div
              key={v.id}
              className={`rounded-xl border ${style.border} ${style.bg} p-3.5 flex items-start gap-3`}
            >
              <Icon className={`w-4 h-4 ${style.text} mt-0.5 shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white truncate">{v.label}</span>
                  <span className={`text-[9px] font-bold tracking-wider ${style.text}`}>{style.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{v.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
