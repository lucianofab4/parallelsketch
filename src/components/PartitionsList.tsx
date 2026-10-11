import { useState } from 'react'
import type { AnalysisResult, AnalyzedInstruction } from '../lib/types'
import { partitionColor } from '../lib/colors'

interface Props {
  result: AnalysisResult
  selected: number | null
  onSelect: (id: number | null) => void
}

function partitionPayload(result: AnalysisResult, partitionId: number): AnalyzedInstruction[] {
  const partition = result.partitions.find(p => p.id === partitionId)
  if (!partition) return []
  return partition.instructionIndexes.map(idx => result.instructions[idx])
}

export default function PartitionsList({ result, selected, onSelect }: Props) {
  const [copied, setCopied] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  function copyPartition(partId: number, e: React.MouseEvent) {
    e.stopPropagation()
    const payload = partitionPayload(result, partId)
    const json = JSON.stringify(payload, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setCopied(partId)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function toggleExpand(partId: number, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(expanded === partId ? null : partId)
  }

  return (
    <div className="animate-fade-in stagger-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-200">Grupos Independentes</h3>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          {result.partitions.length} tx paralelas
        </span>
        <span className="ml-auto text-xs text-slate-600">clique para destacar · copiar JSON</span>
      </div>

      {/* Atomicity disclaimer */}
      <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
        <svg className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
        <p className="text-xs text-amber-600 leading-relaxed">
          <span className="font-semibold text-amber-500">Segurança da divisão não verificada.</span>{' '}
          A análise garante ausência de conflitos de acesso entre os grupos, mas não verifica
          atomicidade, dependências lógicas da aplicação, ordem de efeitos ou necessidade de novas assinaturas.
          Valide antes de enviar.
        </p>
      </div>

      <div className={`grid gap-2.5 ${result.partitions.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {result.partitions.map(partition => {
          const color = partitionColor(partition.id)
          const isSelected = selected === partition.id
          const isDimmed = selected !== null && !isSelected
          const isExpanded = expanded === partition.id
          const isCopied = copied === partition.id
          const payload = partitionPayload(result, partition.id)

          return (
            <div
              key={partition.id}
              className="rounded-xl border transition-all duration-200"
              style={{
                borderColor: isSelected ? color + '70' : isDimmed ? '#1e293b' : '#334155',
                backgroundColor: isSelected ? color + '12' : isDimmed ? '#0f172a' : '#0f172a',
                opacity: isDimmed ? 0.45 : 1,
                boxShadow: isSelected ? `0 0 0 1px ${color}30, 0 4px 20px ${color}15` : 'none',
              }}
            >
              {/* Main card — clickable for highlight */}
              <button
                onClick={() => onSelect(isSelected ? null : partition.id)}
                className="w-full text-left p-4 hover:scale-[1.005] transition-transform duration-150 block"
              >
                {/* Colored top bar */}
                <div
                  className="h-1 w-full rounded-full mb-3 transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? color : color + '50',
                    width: isSelected ? '100%' : '40%',
                  }}
                />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-200">
                    Tx {partition.id + 1}
                  </span>
                  <span
                    className="text-xs font-semibold rounded-full px-2 py-0.5"
                    style={{ backgroundColor: color + '20', color }}
                  >
                    {partition.instructionIndexes.length} instr.
                  </span>
                </div>

                {/* Instruction chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {partition.instructionIndexes.map(idx => (
                    <span
                      key={idx}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold border transition-all duration-150"
                      style={{
                        backgroundColor: isSelected ? color + '25' : color + '12',
                        color: isSelected ? color : color + 'cc',
                        borderColor: isSelected ? color + '60' : color + '25',
                      }}
                    >
                      #{idx}
                    </span>
                  ))}
                </div>

                {/* Accounts written */}
                {partition.accountsWritten.length > 0 && (
                  <p className="text-xs text-slate-600 truncate">
                    Escreve:{' '}
                    <span className="text-slate-500">
                      {partition.accountsWritten.slice(0, 3).join(', ')}
                      {partition.accountsWritten.length > 3 && ` +${partition.accountsWritten.length - 3}`}
                    </span>
                  </p>
                )}
              </button>

              {/* Action bar */}
              <div className="flex items-center gap-1 px-4 pb-3 pt-0">
                <button
                  onClick={(e) => copyPartition(partition.id, e)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${isCopied ? 'animate-copy-pop' : ''}`}
                  style={{
                    backgroundColor: isCopied ? color + '25' : color + '10',
                    color: isCopied ? color : color + 'aa',
                    border: `1px solid ${isCopied ? color + '50' : color + '20'}`,
                  }}
                >
                  {isCopied ? (
                    <>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      Copiar JSON
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => toggleExpand(partition.id, e)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-400 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <svg
                    className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  {isExpanded ? 'Ocultar' : 'Ver payload'}
                </button>
              </div>

              {/* Expandable JSON payload */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div
                    className="rounded-lg border p-3 overflow-x-auto"
                    style={{ borderColor: color + '20', backgroundColor: color + '08' }}
                  >
                    <pre
                      className="text-xs font-mono leading-relaxed whitespace-pre"
                      style={{ color: color + 'cc' }}
                    >
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                  <p className="text-xs text-slate-700 mt-2">
                    ↑ Essas instruções podem ser enviadas como uma transação Solana independente.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
