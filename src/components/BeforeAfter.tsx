import { useState } from 'react'
import type { AnalysisResult } from '../lib/types'
import { partitionColor } from '../lib/colors'

interface Props {
  result: AnalysisResult
}

export default function BeforeAfter({ result }: Props) {
  const n = result.instructions.length
  const m = result.partitions.length   // number of truly independent parallel groups
  const isParallel = m > 1
  const [showMetricInfo, setShowMetricInfo] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/60 animate-scale-in">

      {/* Top bar */}
      <div className="bg-slate-900/95 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Análise concluída</p>
        {isParallel ? (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {m} grupos independentes detectados
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Execução serial obrigatória
            </span>
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 divide-x divide-slate-800">

        {/* ── ANTES ── */}
        <div className="p-7 lg:p-8 bg-slate-900/25 flex flex-col gap-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-5">Antes</p>

          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {result.instructions.map((instr, i) => (
              <span key={instr.index} className="flex items-center gap-1.5">
                <span className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-mono font-bold text-slate-400">
                  #{instr.index}
                </span>
                {i < n - 1 && (
                  <span className="text-slate-700 text-xs select-none">→</span>
                )}
              </span>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/70">
            <p className="text-xl font-black text-slate-300 leading-tight">1 transação serial</p>
            <p className="text-sm text-slate-500 mt-0.5">{n} instrução{n !== 1 ? 'ões' : ''} em sequência</p>
            <p className="text-xs text-slate-700 mt-1.5">Write-locks em série — scheduler não consegue paralelizar</p>
          </div>
        </div>

        {/* ── DEPOIS ── */}
        <div className={`p-7 lg:p-8 flex flex-col ${isParallel ? 'bg-emerald-950/20' : 'bg-amber-950/10'}`}>
          <p className={`text-xs font-black uppercase tracking-widest mb-5 ${isParallel ? 'text-emerald-500' : 'text-amber-600'}`}>
            Depois
          </p>

          {isParallel ? (
            <div className="space-y-3 flex-1">
              {result.partitions.map(partition => {
                const color = partitionColor(partition.id)
                return (
                  <div key={partition.id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 font-mono w-8 flex-shrink-0 font-black">
                      Tx{partition.id + 1}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {partition.instructionIndexes.map(idx => (
                        <span
                          key={idx}
                          className="rounded-xl px-3 py-2 text-sm font-mono font-bold border"
                          style={{
                            backgroundColor: color + '22',
                            color,
                            borderColor: color + '50',
                          }}
                        >
                          #{idx}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-bold text-amber-400 mb-1">Paralelização impossível</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Todas as {n} instruções estão no mesmo componente conexo do grafo de conflitos —
                  compartilham contas graváveis direta ou transitivamente.
                </p>
                {result.hotAccounts.length > 0 && (
                  <p className="text-xs text-slate-600 mt-2">
                    Gargalo:{' '}
                    <code className="text-amber-500/80 font-mono">{result.hotAccounts[0].pubkey}</code>
                    {' '}({result.hotAccounts[0].writeCount} escritas)
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Para paralelizar, elimine o compartilhamento de contas graváveis entre grupos de instruções.
              </p>
            </div>
          )}

          {/* BIG number: number of parallel groups */}
          <div className="mt-6 pt-5 border-t border-slate-800/50 flex items-end gap-4">
            <span
              className={`font-black tabular-nums leading-none tracking-tighter ${
                isParallel ? 'text-emerald-400' : 'text-slate-700'
              }`}
              style={{ fontSize: 'clamp(3.5rem, 7vw, 6rem)' }}
            >
              {m}
            </span>
            <div className="pb-1 flex-1">
              <p className={`text-lg font-black leading-tight ${isParallel ? 'text-emerald-400' : 'text-slate-600'}`}>
                {isParallel
                  ? `grupo${m !== 1 ? 's' : ''} independente${m !== 1 ? 's' : ''}`
                  : 'sem paralelismo'}
              </p>
              <p className="text-sm text-slate-500">
                {isParallel
                  ? `candidatos à execução concorrente · sem conflitos de acesso entre eles`
                  : `${n} instruções formam 1 componente conexo`}
              </p>
              <div className="relative mt-1.5">
                <button
                  onClick={() => setShowMetricInfo(v => !v)}
                  className="text-xs text-slate-700 hover:text-slate-500 underline underline-offset-2 transition-colors"
                >
                  O que significa esse número?
                </button>
                {showMetricInfo && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400 leading-relaxed shadow-xl z-10 animate-tooltip-in">
                    <p className="font-bold text-slate-300 mb-1">Componentes conexos do grafo de conflitos</p>
                    <p>
                      <strong className="text-white">{m}</strong> é o número de grupos de instruções que
                      não compartilham nenhuma conta gravável entre si — nem direta, nem transitivamente.
                      Os {m} grupo{m !== 1 ? 's' : ''} identificado{m !== 1 ? 's' : ''} não apresentam conflitos
                      de acesso às contas entre si e são candidatos à execução concorrente no Solana.
                      Execução no mesmo slot não é garantida — depende de agendamento, compute budget e congestionamento.
                    </p>
                    {isParallel && (
                      <p className="mt-1.5 text-slate-500">
                        Dentro de cada grupo, as instruções ainda executam em série (comportamento normal do Solana).
                        O ganho é entre grupos.
                      </p>
                    )}
                    <button
                      onClick={() => setShowMetricInfo(false)}
                      className="mt-2 text-slate-600 hover:text-slate-400"
                    >
                      Fechar ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
