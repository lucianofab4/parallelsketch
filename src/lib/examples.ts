import type { AnalyzedInstruction } from './types'

export interface Example {
  key: string
  label: string
  description: string
  instructions: Omit<AnalyzedInstruction, 'index'>[]
}

export const EXAMPLES: Example[] = [
  {
    // 4 swaps, cada um com wallet e pool totalmente distintos.
    // Nenhum par compartilha conta gravável → 4 componentes conexos → 4 tx paralelas reais.
    key: 'multi-swap',
    label: 'Multi-DEX (4 swaps)',
    description: '4 usuários, pools distintos — zero conflitos, 4 transações realmente paralelas',
    instructions: [
      {
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        accounts: [
          { pubkey: 'WalletAlice', isWritable: true,  isSigner: true  },
          { pubkey: 'SOL_USDC_Pool', isWritable: true,  isSigner: false },
          { pubkey: 'AliceSOLAta',   isWritable: true,  isSigner: false },
          { pubkey: 'AliceUSDCAta',  isWritable: true,  isSigner: false },
        ],
      },
      {
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        accounts: [
          { pubkey: 'WalletBob',     isWritable: true,  isSigner: true  },
          { pubkey: 'RAY_USDT_Pool', isWritable: true,  isSigner: false },
          { pubkey: 'BobRAYAta',     isWritable: true,  isSigner: false },
          { pubkey: 'BobUSDTAta',    isWritable: true,  isSigner: false },
        ],
      },
      {
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        accounts: [
          { pubkey: 'WalletCarol',   isWritable: true,  isSigner: true  },
          { pubkey: 'BONK_SOL_Pool', isWritable: true,  isSigner: false },
          { pubkey: 'CarolBONKAta',  isWritable: true,  isSigner: false },
          { pubkey: 'CarolSOLAta',   isWritable: true,  isSigner: false },
        ],
      },
      {
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        accounts: [
          { pubkey: 'WalletDave',    isWritable: true,  isSigner: true  },
          { pubkey: 'WIF_SOL_Pool',  isWritable: true,  isSigner: false },
          { pubkey: 'DaveWIFAta',    isWritable: true,  isSigner: false },
          { pubkey: 'DaveSOLAta',    isWritable: true,  isSigner: false },
        ],
      },
    ],
  },
  {
    // Cadeia linear onde cada instrução escreve em conta lida pela próxima.
    // Um único componente conexo → zero paralelismo possível.
    key: 'chain-dependent',
    label: 'Cadeia Sequencial',
    description: 'Cada instrução depende da anterior — 1 componente, zero paralelismo',
    instructions: [
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'Minter',      isWritable: true, isSigner: true  },
          { pubkey: 'TokenVault',  isWritable: true, isSigner: false },
        ],
      },
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'TokenVault',  isWritable: true, isSigner: false },
          { pubkey: 'Escrow',      isWritable: true, isSigner: false },
        ],
      },
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'Escrow',       isWritable: true, isSigner: false },
          { pubkey: 'RecipientAta', isWritable: true, isSigner: false },
        ],
      },
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'RecipientAta',    isWritable: true, isSigner: false },
          { pubkey: 'FinalDestination',isWritable: true, isSigner: false },
        ],
      },
    ],
  },
  {
    // 6 instruções com conflitos parciais → 4 componentes conexos → 4 tx paralelas reais.
    // Componente A: {#0, #2} — Alice e Bob compartilham BobWallet
    // Componente B: {#1, #4} — Carol compartilha CarolWallet
    // Componente C: {#3}     — Eve é independente
    // Componente D: {#5}     — Grace é independente
    key: 'complex',
    label: 'Misto (conflitos parciais)',
    description: '6 instruções, conflitos parciais → 4 grupos independentes reais',
    instructions: [
      {
        // #0: Alice → Bob  (componente A)
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'AliceWallet', isWritable: true, isSigner: true  },
          { pubkey: 'BobWallet',   isWritable: true, isSigner: false },
        ],
      },
      {
        // #1: Carol minta tokens  (componente B)
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'CarolWallet', isWritable: true, isSigner: true  },
          { pubkey: 'MintAccount', isWritable: true, isSigner: false },
        ],
      },
      {
        // #2: Bob → Dave  (componente A — Bob reaparece como writable)
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'BobWallet',  isWritable: true, isSigner: false },
          { pubkey: 'DaveWallet', isWritable: true, isSigner: false },
        ],
      },
      {
        // #3: Eve → Frank  (componente C — totalmente independente)
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'EveWallet',   isWritable: true, isSigner: true  },
          { pubkey: 'FrankWallet', isWritable: true, isSigner: false },
        ],
      },
      {
        // #4: Carol stake  (componente B — Carol reaparece como writable)
        programId: 'StakeProgram11111111111111111111111111111111',
        accounts: [
          { pubkey: 'CarolWallet', isWritable: true, isSigner: false },
          { pubkey: 'StakePool',   isWritable: true, isSigner: false },
        ],
      },
      {
        // #5: Grace → Henry  (componente D — totalmente independente)
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        accounts: [
          { pubkey: 'GraceWallet', isWritable: true, isSigner: true  },
          { pubkey: 'HenryWallet', isWritable: true, isSigner: false },
        ],
      },
    ],
  },
]
