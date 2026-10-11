import { useState } from 'react'
import type { AnalysisResult, DependencyEdge } from './lib/types'
import { parseInput, analyzeInstructions } from './lib/analyzer'
import { tryParseBase64, parseVersionedTransaction, detectInputType } from './lib/solanaParser'
import { EXAMPLES } from './lib/examples'
import { REAL_TX_SAMPLES } from './lib/realTransactions'
import InputPanel from './components/InputPanel'
import SummaryCards from './components/SummaryCards'
import BeforeAfter from './components/BeforeAfter'
import HotAccountsList from './components/HotAccountsList'
import PartitionsList from './components/PartitionsList'
import DependencyGraph from './components/DependencyGraph'


export default function App() {
  const [input, setInput]               = useState('')
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [warning, setWarning]           = useState<string | null>(null)
  const [analyzing, setAnalyzing]       = useState(false)
  const [selectedPartition, setSelectedPartition] = useState<number | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<DependencyEdge | null>(null)

  const inputType = detectInputType(input)

  function runAnalysis(text: string) {
    setAnalyzing(true)
    setError(null)
    setWarning(null)
    setSelectedPartition(null)
    setSelectedEdge(null)
    setTimeout(() => {
      const type = detectInputType(text)
      try {
        let instructions: AnalysisResult['instructions']
        if (type === 'base64') {
          const tx = tryParseBase64(text)
          if (!tx) throw new Error('Não foi possível deserializar a transação. No Solscan: View → Advanced → Base64.')
          const parsed = parseVersionedTransaction(tx)
          instructions = parsed.instructions
          if (parsed.hasALTs) setWarning(`Transação usa ALTs (${parsed.altCount} endereços externos) — análise parcial.`)
        } else if (type === 'signature') {
          throw new Error('Parece uma signature. Cole a transação em base64 (Solscan → View → Advanced → Base64).')
        } else {
          instructions = parseInput(text)
        }
        if (instructions.length === 0) throw new Error('A transação não contém instruções.')
        setResult(analyzeInstructions(instructions))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setResult(null)
      } finally {
        setAnalyzing(false)
      }
    }, 200)
  }

  function handleDemo() {
    const ex = EXAMPLES.find(e => e.key === 'complex')!
    const json = JSON.stringify(ex.instructions, null, 2)
    setInput(json)
    runAnalysis(json)
    setTimeout(() => setSelectedPartition(0), 650)
  }

  function handleDemoByKey(key: string) {
    const ex = EXAMPLES.find(e => e.key === key)
    if (!ex) return
    const json = JSON.stringify(ex.instructions, null, 2)
    setInput(json)
    runAnalysis(json)
  }

  function handleRealTx(base64: string) {
    setInput(base64)
    runAnalysis(base64)
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setWarning(null)
    setSelectedEdge(null)
    setSelectedPartition(null)
  }

  function handleExport() {
    if (!result) return
    const data = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalInstructions: result.instructions.length,
        totalPartitions: result.partitions.length,
        parallelizationRatio: Number((result.instructions.length / result.partitions.length).toFixed(2)),
      },
      partitions: result.partitions.map(p => ({ partitionNumber: p.id + 1, instructionIndexes: p.instructionIndexes, accountsWritten: p.accountsWritten })),
      dependencyEdges: result.dependencyEdges,
      instructions: result.instructions,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parallelsketch-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasResult = !analyzing && !!result

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/95 backdrop-blur-md px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/40 flex-shrink-0">
            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-bold text-white tracking-tight">ParallelSketch</span>
              <span className="hidden md:block text-slate-800">·</span>
              <span className="hidden md:block text-xs text-slate-500 truncate">
                Descubra quantas transações paralelas sua operação realmente permite
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {hasResult && (
              <>
                <button onClick={handleExport}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Exportar
                </button>
                <button onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Nova análise
                </button>
              </>
            )}
            <button onClick={handleDemo} disabled={analyzing}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500/12 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/22 disabled:opacity-50 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
              Demo
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 sm:px-6 py-6 flex flex-col gap-5">

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-400 flex items-start gap-2 animate-fade-in">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}
        {warning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-400 flex items-start gap-2 animate-fade-in">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {warning}
          </div>
        )}

        {/* ── STATE: No result → Split panel with input + empty state ── */}
        {!hasResult && !analyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 h-full">
                <InputPanel value={input} onChange={setInput} onAnalyze={() => runAnalysis(input)} inputType={inputType} analyzing={analyzing} />
              </div>
            </div>
            <div className="lg:col-span-3">
              <EmptyState onDemo={handleDemo} onDemoByKey={handleDemoByKey} onRealTx={handleRealTx} />
            </div>
          </div>
        )}

        {/* ── STATE: Analyzing → Loading shimmer ── */}
        {analyzing && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="h-52 rounded-2xl bg-slate-900/60 animate-pulse" />
            <div className="h-8 rounded-xl bg-slate-900/40 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-36 rounded-xl bg-slate-900/30 animate-pulse" />
              <div className="h-36 rounded-xl bg-slate-900/30 animate-pulse" />
            </div>
          </div>
        )}

        {/* ── STATE: Result → Full-width dashboard ── */}
        {hasResult && (
          <>
            {/* 1. HERO */}
            <BeforeAfter result={result} />

            {/* 2. Stats strip */}
            <SummaryCards result={result} />

            {/* 3. Diagnosis + Action */}
            {result.hotAccounts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1">
                  <HotAccountsList accounts={result.hotAccounts} />
                </div>
                <div className="lg:col-span-2">
                  <PartitionsList result={result} selected={selectedPartition} onSelect={setSelectedPartition} />
                </div>
              </div>
            ) : (
              <PartitionsList result={result} selected={selectedPartition} onSelect={setSelectedPartition} />
            )}

            {/* 4. Detail: Graph */}
            <DependencyGraph result={result} selectedPartition={selectedPartition} onEdgeClick={setSelectedEdge} />

            {/* Edge explanation */}
            {selectedEdge && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 px-5 py-4 animate-fade-up">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-violet-300 mb-1">
                        #{selectedEdge.from} e #{selectedEdge.to} não podem estar na mesma transação paralela
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {selectedEdge.reason === 'write-write' ? (
                          <>Ambas <span className="font-bold text-white">escrevem</span> na conta{' '}
                            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-violet-300">{selectedEdge.account}</code>.{' '}
                            Isso é um <span className="text-red-400 font-semibold">conflito de acesso</span> — o Solana não permite duas transações simultâneas com write-lock na mesma conta.{' '}
                            <span className="text-slate-500">Não implica que uma depende logicamente do resultado da outra.</span>
                          </>
                        ) : (
                          <>Instrução #{selectedEdge.from} <span className="font-bold text-white">escreve</span> na conta{' '}
                            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-violet-300">{selectedEdge.account}</code>{' '}
                            e #{selectedEdge.to} <span className="font-bold text-white">lê</span> essa conta.{' '}
                            Conflito de acesso confirmado.{' '}
                            <span className="text-amber-400 font-semibold">A ordenação pode ser relevante</span> — se #{selectedEdge.to} depende logicamente do valor gravado por #{selectedEdge.from}, deve executar depois. Isso requer conhecimento da semântica das instruções.
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        Tipo: <span className={`font-semibold ${selectedEdge.reason === 'write-write' ? 'text-red-400' : 'text-amber-400'}`}>
                          {selectedEdge.reason === 'write-write' ? 'write-write — conflito puro' : 'write-read — ordem potencialmente relevante'}
                        </span>
                        {' '}· Conta: <code className="text-slate-500 font-mono">{selectedEdge.account}</code>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEdge(null)} className="text-slate-700 hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Action row */}
            <div className="flex gap-2 pb-2">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar análise (JSON)
              </button>
              <button onClick={handleReset}
                className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-300 hover:border-slate-700 transition-colors">
                Nova análise
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/40 py-4 text-center text-xs text-slate-800">
        ParallelSketch · Análise estática de paralelismo · Solana · Hackathon Colosseum 2026
      </footer>
    </div>
  )
}

/* ── Empty state ── */
const DEMO_SCENARIOS = [
  {
    key: 'complex',
    label: 'Misto (parcial)',
    desc: '6 instruções → 4 grupos reais',
    badge: '4',
    badgeColor: '#10b981',
  },
  {
    key: 'multi-swap',
    label: 'Multi-DEX',
    desc: '4 swaps independentes → 4 tx',
    badge: '4',
    badgeColor: '#06b6d4',
  },
  {
    key: 'chain-dependent',
    label: 'Cadeia Serial',
    desc: '4 instruções → 0 paralelismo',
    badge: '1',
    badgeColor: '#f59e0b',
  },
]

function EmptyState({ onDemo, onDemoByKey, onRealTx }: { onDemo: () => void; onDemoByKey: (key: string) => void; onRealTx: (base64: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-7 rounded-2xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-transparent px-8 py-10 min-h-[400px] text-center animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-xl font-black text-white leading-tight tracking-tight">
          Descubra o paralelismo real<br />das suas transações Solana
        </h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          Detecta conflitos de write-lock e gera as partições prontas para envio em paralelo.
        </p>
      </div>

      {/* Scenario quick-launch cards */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {DEMO_SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => onDemoByKey(s.key)}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-left hover:border-slate-700 hover:bg-slate-900 active:scale-95 transition-all group"
          >
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-lg font-black tabular-nums leading-none" style={{ color: s.badgeColor }}>
                {s.badge}
              </span>
              <span className="text-[10px] font-bold leading-none" style={{ color: s.badgeColor + '99' }}>
                {s.badge === '1' ? ' grupo' : ' grupos'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-300 leading-tight">{s.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{s.desc}</p>
          </button>
        ))}
      </div>

      <button onClick={onDemo}
        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-bold text-white hover:bg-cyan-400 active:scale-95 transition-all shadow-xl shadow-cyan-500/20">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        Rodar Demo Completa
      </button>

      {/* Real mainnet tx */}
      <div className="w-full border-t border-slate-800/50 pt-5">
        <p className="text-xs text-slate-700 uppercase tracking-wider font-bold mb-2 text-center">
          Transações reais de mainnet
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {REAL_TX_SAMPLES.map((tx, i) => (
            <button
              key={i}
              onClick={() => onRealTx(tx.base64)}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-slate-700 hover:bg-slate-900 active:scale-95 transition-all"
            >
              <div>
                <p className="text-xs font-semibold text-slate-400">{tx.label}</p>
                <p className="text-[10px] text-slate-600">{tx.description}</p>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
