import { VersionedTransaction } from '@solana/web3.js'
import type { AnalyzedInstruction, AccountAccess } from './types'

export interface SolanaParseResult {
  instructions: AnalyzedInstruction[]
  hasALTs: boolean
  altCount: number
}

export function parseVersionedTransaction(tx: VersionedTransaction): SolanaParseResult {
  const msg = tx.message
  const staticKeys = msg.staticAccountKeys

  // ALT lookups — only available on MessageV0
  const altLookups = 'addressTableLookups' in msg
    ? (msg as { addressTableLookups: Array<{ writableIndexes: number[]; readonlyIndexes: number[] }> }).addressTableLookups
    : []

  const altCount = altLookups.reduce(
    (acc, lt) => acc + lt.writableIndexes.length + lt.readonlyIndexes.length,
    0,
  )
  const hasALTs = altCount > 0

  function getPubkey(idx: number): string {
    return staticKeys[idx]?.toBase58() ?? `ALT_${idx}`
  }

  const instructions: AnalyzedInstruction[] = msg.compiledInstructions.map((ix, index) => {
    const programId = getPubkey(ix.programIdIndex)
    const accounts: AccountAccess[] = ix.accountKeyIndexes.map(keyIndex => ({
      pubkey: getPubkey(keyIndex),
      isWritable: msg.isAccountWritable(keyIndex),
      isSigner: msg.isAccountSigner(keyIndex),
    }))
    return { index, programId, accounts }
  })

  return { instructions, hasALTs, altCount }
}

export function tryParseBase64(input: string): VersionedTransaction | null {
  try {
    const cleaned = input.trim().replace(/\s/g, '')
    const bytes = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0))
    return VersionedTransaction.deserialize(bytes)
  } catch {
    return null
  }
}

export function detectInputType(
  input: string,
): 'json' | 'base64' | 'signature' | 'unknown' {
  const t = input.trim()
  if (!t) return 'unknown'
  if (t.startsWith('[') || t.startsWith('{')) return 'json'
  if (/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(t)) return 'signature'
  if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length > 80) return 'base64'
  return 'unknown'
}
