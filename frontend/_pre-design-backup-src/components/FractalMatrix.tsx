import type { FractalRow } from '../types/macro'
import { fmtDelta, fmtLevel, trendTone } from '../lib/confluence'
import { ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, CircleDot } from 'lucide-react'

function TrendCell({ value, trend, unit }: { value: number; trend: FractalRow['trends']['d']; unit: FractalRow['unit'] }) {
  const Icon =
    trend === 'UP'   ? ArrowUpRight :
    trend === 'DOWN' ? ArrowDownRight :
                       Minus
  return (
    <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm ${trendTone(trend)}`}>
      <span className="inline-flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {fmtDelta(value, unit)}
      </span>
    </td>
  )
}

export function FractalMatrix({ rows, alignmentPct }: { rows: FractalRow[]; alignmentPct: number }) {
  const scoreColor =
    alignmentPct >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    alignmentPct >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                         'text-rose-400 bg-rose-500/10 border-rose-500/30'

  const alignedCount = rows.filter(r => r.aligned).length

  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-bold text-white">Alineación Fractal por Activo</p>
          <p className="text-xs text-slate-500 mt-0.5">Diario × Semanal × Mensual — verde = mismas direcciones</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${scoreColor}`}>
          {alignmentPct}% alineados ({alignedCount}/{rows.length})
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/[0.05]">
              <th className="px-5 py-2.5 text-left">Activo</th>
              <th className="px-3 py-2.5 text-right">Nivel</th>
              <th className="px-3 py-2.5 text-right">Diario</th>
              <th className="px-3 py-2.5 text-right">Semanal</th>
              <th className="px-3 py-2.5 text-right">Mensual</th>
              <th className="px-5 py-2.5 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2.5 text-sm font-semibold text-white">{r.label}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-slate-300">
                  {fmtLevel(r.level, r.key)}
                </td>
                <TrendCell value={r.d} trend={r.trends.d} unit={r.unit} />
                <TrendCell value={r.w} trend={r.trends.w} unit={r.unit} />
                <TrendCell value={r.m} trend={r.trends.m} unit={r.unit} />
                <td className="px-5 py-2.5 text-center">
                  {r.aligned ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      r.dominant_bias === 'UP'
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      ALINEADO {r.dominant_bias === 'UP' ? '↑' : '↓'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30">
                      <CircleDot className="w-3 h-3" />
                      TRANSICIÓN
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
