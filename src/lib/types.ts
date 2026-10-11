export interface AccountAccess {
  pubkey: string
  isWritable: boolean
  isSigner: boolean
}

export interface AnalyzedInstruction {
  index: number
  programId: string
  accounts: AccountAccess[]
}

export interface DependencyEdge {
  from: number
  to: number
  account: string
  reason: 'write-write' | 'write-read'
}

export interface Partition {
  id: number
  instructionIndexes: number[]
  accountsWritten: string[]
}

export interface AnalysisResult {
  instructions: AnalyzedInstruction[]
  partitions: Partition[]
  hotAccounts: { pubkey: string; writeCount: number }[]
  dependencyEdges: DependencyEdge[]
  analysisTimeMs: number
}
