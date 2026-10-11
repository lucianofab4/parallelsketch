import type { AnalysisResult } from '../lib/types'

interface Props {
  result: AnalysisResult
}

export default function SummaryCards({ result }: Props) {
  const n = result.instructions.length
  const m = result.partitions.length

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 animate-fade-in stagger-2">
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-blue-400">{n}</span>
        <span className="text-xs text-slate-500">instrução{n !== 1 ? 'ões' : ''}</span>
      </div>

      <span className="text-slate-800">·</span>

      <div className="flex items-center gap-1.5">
        <span className={`text-base font-bold ${m > 1 ? 'text-emerald-400' : 'text-slate-600'}`}>{m}</span>
        <span className="text-xs text-slate-500">grupo{m !== 1 ? 's' : ''} independente{m !== 1 ? 's' : ''}</span>
      </div>

      <span className="text-slate-800">·</span>

      <div className="flex items-center gap-1.5">
        <span className={`text-base font-bold ${result.hotAccounts.length > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
          {result.hotAccounts.length}
        </span>
        <span className="text-xs text-slate-500">conta{result.hotAccounts.length !== 1 ? 's' : ''} quente{result.hotAccounts.length !== 1 ? 's' : ''}</span>
      </div>

      <span className="text-slate-800">·</span>

      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-slate-600">{result.dependencyEdges.length}</span>
        <span className="text-xs text-slate-500">conflito{result.dependencyEdges.length !== 1 ? 's' : ''} detectado{result.dependencyEdges.length !== 1 ? 's' : ''}</span>
      </div>

      <span className="ml-auto text-xs text-slate-700">{result.analysisTimeMs.toFixed(2)}ms</span>
    </div>
  )
}
