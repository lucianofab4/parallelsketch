import { describe, it, expect } from 'vitest'
import { analyzeInstructions, parseInput } from '../analyzer'
import type { AnalyzedInstruction } from '../types'
import { EXAMPLES } from '../examples'

// ── helpers ──────────────────────────────────────────────────────────────────

function instr(
  idx: number,
  accounts: Array<{ pubkey: string; isWritable: boolean; isSigner?: boolean }>,
): AnalyzedInstruction {
  return {
    index: idx,
    programId: 'TestProgram',
    accounts: accounts.map(a => ({ ...a, isSigner: a.isSigner ?? false })),
  }
}

function componentSizes(result: ReturnType<typeof analyzeInstructions>): number[] {
  return result.partitions
    .map(p => p.instructionIndexes.length)
    .sort((a, b) => a - b)
}

// ── core algorithm ────────────────────────────────────────────────────────────

describe('Union-Find: conflict detection', () => {
  it('read-read: dois leitores da mesma conta ficam em componentes SEPARADOS', () => {
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: false }]),
      instr(1, [{ pubkey: 'X', isWritable: false }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(2)
    expect(result.dependencyEdges).toHaveLength(0)
  })

  it('write-write: dois escritores da mesma conta ficam no MESMO componente', () => {
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: true }]),
      instr(1, [{ pubkey: 'X', isWritable: true }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(1)
    expect(result.dependencyEdges[0].reason).toBe('write-write')
  })

  it('write-read: escritor e leitor da mesma conta ficam no MESMO componente', () => {
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: true  }]),
      instr(1, [{ pubkey: 'X', isWritable: false }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(1)
    expect(result.dependencyEdges[0].reason).toBe('write-read')
    expect(result.dependencyEdges[0].from).toBe(0)
    expect(result.dependencyEdges[0].to).toBe(1)
  })

  it('write-read invertido: leitor antes do escritor → from=escritor, to=leitor', () => {
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: false }]),
      instr(1, [{ pubkey: 'X', isWritable: true  }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(1)
    // from sempre aponta para o escritor
    expect(result.dependencyEdges[0].from).toBe(1)
    expect(result.dependencyEdges[0].to).toBe(0)
  })
})

describe('Union-Find: componentes conexos transitivos', () => {
  it('cadeia A-B-C: A conflita com B, B conflita com C → 1 componente', () => {
    // A e C não se veem diretamente, mas B os une transitivamente
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: true }]),
      instr(1, [{ pubkey: 'X', isWritable: true }, { pubkey: 'Y', isWritable: true }]),
      instr(2, [{ pubkey: 'Y', isWritable: true }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(1)
    expect(result.partitions[0].instructionIndexes).toEqual([0, 1, 2])
  })

  it('dois pares isolados: [A-B] e [C-D] → 2 componentes independentes', () => {
    const instructions = [
      instr(0, [{ pubkey: 'X', isWritable: true }]),
      instr(1, [{ pubkey: 'X', isWritable: true }]),
      instr(2, [{ pubkey: 'Y', isWritable: true }]),
      instr(3, [{ pubkey: 'Y', isWritable: true }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(2)
    expect(componentSizes(result)).toEqual([2, 2])
  })

  it('4 instruções completamente independentes → 4 componentes', () => {
    const instructions = [
      instr(0, [{ pubkey: 'A', isWritable: true }]),
      instr(1, [{ pubkey: 'B', isWritable: true }]),
      instr(2, [{ pubkey: 'C', isWritable: true }]),
      instr(3, [{ pubkey: 'D', isWritable: true }]),
    ]
    const result = analyzeInstructions(instructions)
    expect(result.partitions).toHaveLength(4)
    expect(result.dependencyEdges).toHaveLength(0)
  })
})

// ── built-in examples ─────────────────────────────────────────────────────────

describe('Exemplos embutidos', () => {
  function loadExample(key: string): AnalyzedInstruction[] {
    const ex = EXAMPLES.find(e => e.key === key)!
    return ex.instructions.map((instr, i) => ({ ...instr, index: i }))
  }

  it('multi-swap: 4 wallets distintos → 4 componentes independentes reais', () => {
    const result = analyzeInstructions(loadExample('multi-swap'))
    expect(result.partitions).toHaveLength(4)
    expect(result.dependencyEdges).toHaveLength(0)
    // Nenhuma conta gravável é compartilhada entre grupos
    const writableSets = result.partitions.map(p => new Set(p.accountsWritten))
    for (let i = 0; i < writableSets.length; i++) {
      for (let j = i + 1; j < writableSets.length; j++) {
        const intersection = [...writableSets[i]].filter(a => writableSets[j].has(a))
        expect(intersection).toHaveLength(0)
      }
    }
  })

  it('chain-dependent: cadeia linear → 1 componente (zero paralelismo)', () => {
    const result = analyzeInstructions(loadExample('chain-dependent'))
    expect(result.partitions).toHaveLength(1)
    expect(result.partitions[0].instructionIndexes).toHaveLength(4)
  })

  it('complex (misto): 6 instruções → exatamente 4 componentes', () => {
    const result = analyzeInstructions(loadExample('complex'))
    expect(result.partitions).toHaveLength(4)
    // Componente A: {#0, #2} (BobWallet)
    // Componente B: {#1, #4} (CarolWallet)
    // Componente C: {#3}     (independente)
    // Componente D: {#5}     (independente)
    expect(componentSizes(result)).toEqual([1, 1, 2, 2])
  })

  it('complex: grupos sem contas graváveis compartilhadas entre si', () => {
    const result = analyzeInstructions(loadExample('complex'))
    const writableSets = result.partitions.map(p => new Set(p.accountsWritten))
    for (let i = 0; i < writableSets.length; i++) {
      for (let j = i + 1; j < writableSets.length; j++) {
        const intersection = [...writableSets[i]].filter(a => writableSets[j].has(a))
        expect(intersection).toHaveLength(0)
      }
    }
  })
})

// ── hot accounts ──────────────────────────────────────────────────────────────

describe('Hot accounts', () => {
  it('conta gravada por 1 instrução NÃO aparece como hot', () => {
    const result = analyzeInstructions([
      instr(0, [{ pubkey: 'X', isWritable: true }]),
    ])
    expect(result.hotAccounts).toHaveLength(0)
  })

  it('conta gravada por 2+ instruções aparece como hot com contagem correta', () => {
    const result = analyzeInstructions([
      instr(0, [{ pubkey: 'Pool', isWritable: true }]),
      instr(1, [{ pubkey: 'Pool', isWritable: true }]),
      instr(2, [{ pubkey: 'Pool', isWritable: true }]),
    ])
    expect(result.hotAccounts).toHaveLength(1)
    expect(result.hotAccounts[0].pubkey).toBe('Pool')
    expect(result.hotAccounts[0].writeCount).toBe(3)
  })

  it('hot accounts ordenados por writeCount decrescente', () => {
    const result = analyzeInstructions([
      instr(0, [{ pubkey: 'A', isWritable: true }, { pubkey: 'B', isWritable: true }]),
      instr(1, [{ pubkey: 'A', isWritable: true }, { pubkey: 'B', isWritable: true }]),
      instr(2, [{ pubkey: 'A', isWritable: true }]),
    ])
    expect(result.hotAccounts[0].pubkey).toBe('A')
    expect(result.hotAccounts[0].writeCount).toBe(3)
    expect(result.hotAccounts[1].pubkey).toBe('B')
    expect(result.hotAccounts[1].writeCount).toBe(2)
  })
})

// ── parseInput ────────────────────────────────────────────────────────────────

describe('parseInput', () => {
  it('JSON válido parseia corretamente e atribui índices sequenciais', () => {
    const json = JSON.stringify([
      { programId: 'Prog', accounts: [{ pubkey: 'X', isWritable: true, isSigner: false }] },
      { programId: 'Prog', accounts: [{ pubkey: 'Y', isWritable: false, isSigner: false }] },
    ])
    const result = parseInput(json)
    expect(result).toHaveLength(2)
    expect(result[0].index).toBe(0)
    expect(result[1].index).toBe(1)
  })

  it('JSON inválido lança erro com mensagem clara', () => {
    expect(() => parseInput('not json')).toThrow('JSON inválido')
  })

  it('array vazio é aceito sem erro', () => {
    expect(parseInput('[]')).toHaveLength(0)
  })

  it('instrução sem campo accounts lança erro descritivo', () => {
    expect(() => parseInput('[{"programId":"P"}]')).toThrow('accounts')
  })

  it('conta sem pubkey lança erro descritivo', () => {
    expect(() =>
      parseInput('[{"accounts":[{"isWritable":true}]}]'),
    ).toThrow('pubkey')
  })
})
