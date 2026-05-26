import type { Thesis } from '../types/macro'
import { THESIS_STYLE } from '../lib/confluence'
import { CheckCircle2, AlertTriangle, Newspaper, Zap } from 'lucide-react'

export function ThesisReport({ thesis }: { thesis: Thesis }) {
  const cfg = THESIS_STYLE[thesis.direction]
  // Tesis "fuerte" cuando hay direccionalidad (no consolidación) Y la confluencia cross-asset es alta
  const isStrong = thesis.direction !== 'CONSOLIDATION' && thesis.alignment_pct >= 65
  const glow = thesis.direction === 'BEARISH_RISK'
    ? 'shadow-[0_0_44px_-10px_rgba(244,63,94,0.55)] ring-1 ring-rose-500/30'
    : thesis.direction === 'BULLISH_RISK'
    ? 'shadow-[0_0_44px_-10px_rgba(52,211,153,0.55)] ring-1 ring-emerald-500/30'
    : ''

  return (
    <div className={`relative rounded-2xl border-2 ${isStrong ? cfg.border.replace('/20', '/55') + ' ' + glow : cfg.border} bg-gradient-to-br ${cfg.bg} via-transparent to-transparent p-6 md:p-7 transition-all duration-300`}>
      {isStrong && (
        <div className={`absolute -top-2.5 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full ${cfg.text} ${cfg.border.replace('/20', '/60')} border-2 bg-slate-950/80 text-[10px] font-black tracking-widest uppercase shadow-[0_0_14px_-2px_currentColor] animate-pulse`}>
          <Zap className="w-3 h-3" fill="currentColor" />
          TESIS FUERTE
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${cfg.accent} bg-opacity-20 border ${cfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.accent}`} />
          <span className={`text-[11px] font-bold tracking-widest ${cfg.text}`}>SESGO {cfg.label}</span>
        </span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          Cross-asset {thesis.alignment_pct}% · Fractal {thesis.fractal_pct}%
        </span>
      </div>

      <h3 className="text-lg md:text-xl font-bold text-white leading-snug mb-5">
        {thesis.headline}
      </h3>

      {thesis.confirming.length > 0 && (
        <Section title="Evidencia confirmatoria" toneClass="text-emerald-400">
          {thesis.confirming.map((line, i) => (
            <Bullet key={i} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500/70" />} text={line} />
          ))}
        </Section>
      )}

      {thesis.diverging.length > 0 && (
        <Section title="Divergencias / Alertas" toneClass="text-rose-400">
          {thesis.diverging.map((line, i) => (
            <Bullet key={i} icon={<AlertTriangle className="w-4 h-4 text-rose-500/70" />} text={line} />
          ))}
        </Section>
      )}

      {thesis.news_commentary.length > 0 && (
        <Section title="Lectura fundamental (vinculada a titulares recientes)" toneClass="text-indigo-400">
          {thesis.news_commentary.map((line, i) => (
            <Bullet key={i} icon={<Newspaper className="w-4 h-4 text-indigo-500/70" />} text={line} />
          ))}
        </Section>
      )}

      <div className="mt-6 pt-5 border-t border-white/[0.08]">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">
          Por ende, lo esperable es
        </p>
        <p className={`text-base font-medium ${cfg.text} leading-relaxed`}>
          → {thesis.expectation}
        </p>
      </div>
    </div>
  )
}

function Section({ title, toneClass, children }: {
  title: string; toneClass: string; children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2.5 ${toneClass}`}>{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </li>
  )
}
