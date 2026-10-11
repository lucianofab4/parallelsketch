import { EXAMPLES } from '../lib/examples'

interface Props {
  value: string
  onChange: (v: string) => void
  onAnalyze: () => void
  inputType: 'json' | 'base64' | 'signature' | 'unknown'
  analyzing: boolean
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  json:      { label: 'JSON de instruções',          cls: 'text-cyan-400 bg-cyan-500/10 ring-cyan-500/20' },
  base64:    { label: 'Transação Solana (base64)',    cls: 'text-violet-400 bg-violet-500/10 ring-violet-500/20' },
  signature: { label: 'Signature — use base64',      cls: 'text-amber-400 bg-amber-500/10 ring-amber-500/20' },
  unknown:   { label: '',                             cls: '' },
}

// Left-border accent color per example
const EXAMPLE_ACCENT: Record<string, string> = {
  'no-conflict':    '#10b981', // emerald
  'write-conflict': '#f59e0b', // amber
  'complex':        '#06b6d4', // cyan
}

const PLACEHOLDER = `[
  {
    "programId": "DexProgram",
    "accounts": [
      { "pubkey": "UserA", "isWritable": true,  "isSigner": true  },
      { "pubkey": "Pool",  "isWritable": true,  "isSigner": false }
    ]
  },
  {
    "programId": "DexProgram",
    "accounts": [
      { "pubkey": "UserB", "isWritable": true,  "isSigner": true  },
      { "pubkey": "Pool",  "isWritable": true,  "isSigner": false }
    ]
  }
]`

export default function InputPanel({ value, onChange, onAnalyze, inputType, analyzing }: Props) {
  const badge = TYPE_BADGE[inputType]

  function loadExample(key: string) {
    const ex = EXAMPLES.find(e => e.key === key)
    if (!ex) return
    onChange(JSON.stringify(ex.instructions, null, 2))
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Entrada</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          JSON de instruções{' '}
          <span className="text-slate-700">ou</span>{' '}
          <span className="text-violet-400">transação Solana em base64</span>
        </p>
      </div>

      {/* Example cards */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Exemplos prontos</p>
        {EXAMPLES.map(ex => {
          const accent = EXAMPLE_ACCENT[ex.key]
          return (
            <button
              key={ex.key}
              onClick={() => loadExample(ex.key)}
              className="group flex items-start gap-0 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-left hover:border-slate-600 transition-all duration-150"
              style={{ boxShadow: 'none' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = accent + '60'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = accent + '08'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = ''
                ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
              }}
            >
              {/* Colored left bar */}
              <span
                className="w-1 self-stretch flex-shrink-0 rounded-l-xl transition-all duration-150"
                style={{ backgroundColor: accent + '60' }}
              />
              <div className="flex items-start gap-2.5 px-3 py-2.5 flex-1 min-w-0">
                <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: accent }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                    {ex.label}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-tight">{ex.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Textarea */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={analyzing}
          className="flex-1 min-h-44 w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-300 placeholder:text-slate-800 resize-none outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/15 disabled:opacity-50 transition leading-relaxed"
          spellCheck={false}
        />

        {badge.label && (
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        )}
      </div>

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={!value.trim() || analyzing}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15"
      >
        {analyzing ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Analisando…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
            Analisar
          </>
        )}
      </button>
    </div>
  )
}
