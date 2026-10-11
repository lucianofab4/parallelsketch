import type {
  AccountAccess,
  AnalyzedInstruction,
  AnalysisResult,
  DependencyEdge,
  Partition,
} from './types'

type RawAccount = {
  pubkey?: unknown
  isWritable?: unknown
  isSigner?: unknown
}

type RawInstruction = {
  index?: unknown
  programId?: unknown
  accounts?: unknown
}

export function parseInput(raw: string): AnalyzedInstruction[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('JSON inválido. Verifique a sintaxe.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('O JSON deve ser um array de instruções [ { ... }, ... ]')
  }

  return (parsed as RawInstruction[]).map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Instrução ${i}: deve ser um objeto`)
    }
    if (!Array.isArray(item.accounts)) {
      throw new Error(`Instrução ${i}: campo "accounts" é obrigatório e deve ser um array`)
    }

    const accounts: AccountAccess[] = (item.accounts as RawAccount[]).map((acc, j) => {
      if (!acc || typeof acc !== 'object') {
        throw new Error(`Instrução ${i}, conta ${j}: deve ser um objeto`)
      }
      if (typeof acc.pubkey !== 'string' || !acc.pubkey) {
        throw new Error(`Instrução ${i}, conta ${j}: "pubkey" é obrigatório`)
      }
      return {
        pubkey: acc.pubkey,
        isWritable: Boolean(acc.isWritable),
        isSigner: Boolean(acc.isSigner),
      }
    })

    return {
      index: typeof item.index === 'number' ? item.index : i,
      programId: typeof item.programId === 'string' ? item.programId : 'Unknown',
      accounts,
    }
  })
}

export function analyzeInstructions(instructions: AnalyzedInstruction[]): AnalysisResult {
  const t0 = performance.now()

  // ── Build conflict edges ──────────────────────────────────────────────────
  // An edge exists between i and j if they share any writable account.
  // write-write: both write → pure conflict (no ordering implied)
  // write-read:  one writes, the other reads → conflict + ordering constraint
  const edgeMap = new Map<string, DependencyEdge>()

  for (let i = 0; i < instructions.length; i++) {
    for (let j = i + 1; j < instructions.length; j++) {
      const ai = instructions[i].accounts
      const aj = instructions[j].accounts

      for (const accI of ai) {
        for (const accJ of aj) {
          if (accI.pubkey !== accJ.pubkey) continue

          let reason: DependencyEdge['reason'] | null = null
          let from = i
          let to = j

          if (accI.isWritable && accJ.isWritable) {
            reason = 'write-write'
          } else if (accI.isWritable && !accJ.isWritable) {
            reason = 'write-read'
          } else if (!accI.isWritable && accJ.isWritable) {
            reason = 'write-read'
            from = j
            to = i
          }

          if (reason !== null) {
            const key = `${Math.min(from, to)}-${Math.max(from, to)}`
            const existing = edgeMap.get(key)
            if (!existing) {
              edgeMap.set(key, { from, to, account: accI.pubkey, reason })
            } else if (reason === 'write-write' && existing.reason !== 'write-write') {
              edgeMap.set(key, { ...existing, reason: 'write-write' })
            }
          }
        }
      }
    }
  }

  const dependencyEdges = Array.from(edgeMap.values())

  // ── Union-Find: find connected components ─────────────────────────────────
  // Two instructions in the same connected component share at least one
  // writable account (directly or transitively), which means they CANNOT
  // be scheduled in parallel by the Solana runtime — regardless of how we
  // split them into transactions, the scheduler would still detect the
  // account-level conflict and serialize them.
  //
  // Instructions in DIFFERENT components have zero shared writable accounts
  // (transitively), so the scheduler CAN execute their transactions in
  // parallel within the same slot.
  const parent = instructions.map((_, i) => i)
  const rank = new Array(instructions.length).fill(0)

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }

  function union(x: number, y: number) {
    const rx = find(x)
    const ry = find(y)
    if (rx === ry) return
    if (rank[rx] < rank[ry]) parent[rx] = ry
    else if (rank[rx] > rank[ry]) parent[ry] = rx
    else { parent[ry] = rx; rank[rx]++ }
  }

  for (const edge of dependencyEdges) {
    union(edge.from, edge.to)
  }

  // ── Group instructions into partitions by component ───────────────────────
  const componentMap = new Map<number, number[]>()
  for (let i = 0; i < instructions.length; i++) {
    const root = find(i)
    if (!componentMap.has(root)) componentMap.set(root, [])
    componentMap.get(root)!.push(i)
  }

  const partitions: Partition[] = Array.from(componentMap.values())
    .sort((a, b) => a[0] - b[0])
    .map((idxs, id) => {
      const sorted = idxs.slice().sort((a, b) => a - b)
      return {
        id,
        instructionIndexes: sorted,
        accountsWritten: [
          ...new Set(
            sorted.flatMap(idx =>
              instructions[idx].accounts
                .filter(a => a.isWritable)
                .map(a => a.pubkey),
            ),
          ),
        ],
      }
    })

  // ── Hot accounts ──────────────────────────────────────────────────────────
  const writeCounts = new Map<string, number>()
  for (const instr of instructions) {
    for (const acc of instr.accounts) {
      if (acc.isWritable) {
        writeCounts.set(acc.pubkey, (writeCounts.get(acc.pubkey) ?? 0) + 1)
      }
    }
  }

  const hotAccounts = Array.from(writeCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([pubkey, writeCount]) => ({ pubkey, writeCount }))
    .sort((a, b) => b.writeCount - a.writeCount)

  return {
    instructions,
    partitions,
    hotAccounts,
    dependencyEdges,
    analysisTimeMs: performance.now() - t0,
  }
}
