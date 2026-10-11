# ParallelSketch

Analisa instruções Solana, detecta conflitos de acesso a contas e identifica grupos que são **candidatos à execução concorrente**.

---

## O problema

No Solana, o scheduler de transações serializa automaticamente qualquer par de transações que compartilhe uma conta gravável. Se você empacota N instruções numa única transação quando elas poderiam estar em transações independentes, você cria contenção desnecessária de write-lock.

**ParallelSketch mostra exatamente onde estão esses conflitos e quais instruções podem ser separadas com segurança do ponto de vista de acesso a contas.**

---

## Como usar em 30 segundos

### Opção 1 — JSON

```json
[
  {
    "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "accounts": [
      { "pubkey": "WalletAlice", "isWritable": true,  "isSigner": true  },
      { "pubkey": "SOL_USDC_Pool","isWritable": true,  "isSigner": false }
    ]
  },
  {
    "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "accounts": [
      { "pubkey": "WalletBob",   "isWritable": true,  "isSigner": true  },
      { "pubkey": "RAY_USDT_Pool","isWritable": true, "isSigner": false }
    ]
  }
]
```

Cole no campo de entrada → clique **Analisar**.

### Opção 2 — Transação base64 (Solscan)

1. Abra qualquer transação em [solscan.io](https://solscan.io)
2. Clique em **Advanced** → **Raw Transaction (Base64)**
3. Cole o texto no campo de entrada

### Opção 3 — Via RPC

```bash
curl https://api.mainnet-beta.solana.com \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"getTransaction",
    "params":["<ASSINATURA>",{"encoding":"base64","maxSupportedTransactionVersion":0}]
  }'
# Use o campo result.transaction[0]
```

---

## O que a ferramenta mostra

| Seção | O que é |
|---|---|
| **Antes / Depois** | Comparação visual: instruções em série → grupos candidatos à execução concorrente |
| **N grupos independentes** | Número de componentes conexos sem conflitos de acesso entre si |
| **Grafo de Conflitos** | write-write (conflito puro) · write-read (ordem potencialmente relevante) |
| **Grupos Prontos** | JSON copiável de cada grupo — instruções agrupadas por componente |
| **Contas Quentes** | Contas graváveis acessadas por mais de uma instrução |

---

## Algoritmo

### 1. Detecção de conflitos

Para cada par de instruções (i, j), verifica se compartilham alguma conta onde pelo menos uma das duas tem `isWritable = true`:

| Caso | Tipo | Significado |
|---|---|---|
| ambas escrevem | `write-write` | Conflito puro de acesso — sem implicação de ordenação lógica |
| uma escreve, outra lê | `write-read` | Conflito de acesso — ordenação pode ser relevante dependendo da semântica da aplicação |
| ambas leem | nenhum | Sem conflito — podem estar em qualquer grupo |

### 2. Componentes conexos (Union-Find)

Instruções conectadas por qualquer aresta de conflito (direta ou transitivamente) formam um **componente conexo**.

- Instruções em **componentes diferentes** não compartilham nenhuma conta gravável → são candidatas à execução concorrente.
- Instruções no **mesmo componente** compartilham contas graváveis direta ou transitivamente → devem ser tratadas sequencialmente ou com cuidado de ordenação.

> Esta é uma estratégia conservadora. Dois nós ligados indiretamente por um terceiro ficam no mesmo componente, mesmo que não conflitem diretamente. Planejamentos mais sofisticados podem encontrar oportunidades adicionais de concorrência.

### Complexidade

`O(N² × A)` — N = número de instruções, A = contas por instrução.

---

## O que o número significa

O número exibido em destaque é **M = quantidade de grupos independentes por contas** (componentes conexos do grafo de conflitos).

- M = 1 → todas as instruções formam um único componente → paralelização impossível por conflito de contas.
- M > 1 → existem M grupos sem conflitos de acesso entre si → candidatos à execução concorrente.

**"Candidatos à execução concorrente"** significa que o scheduler do Solana não precisaria serializar essas transações por conflito de write-lock. A execução no mesmo slot não é garantida — depende de agendamento, compute budget e congestionamento da rede.

---

## Limitações conhecidas

**Atomicidade de negócio não verificada.**
A análise garante ausência de conflitos de acesso às contas entre os grupos. Não verifica se a divisão preserva a atomicidade da operação original, a ordem dos efeitos, a necessidade de novas assinaturas ou dependências lógicas da aplicação.

Exemplo: `Debitar Alice` e `Creditar Bob` podem estar em componentes separados, mas se representam uma transferência atômica, separá-las em transações distintas altera o comportamento.

**Address Lookup Tables (ALTs).**
Contas carregadas via ALT aparecem como `ALT_0`, `ALT_1`, etc. quando os endereços reais não podem ser resolvidos estaticamente. A análise é parcial — para resultado completo, resolva os ALTs via RPC antes de colar a transação.

**Análise estática.**
Detecta conflitos por pubkey de conta. Não executa as instruções nem simula o estado on-chain.

---

## Testes automatizados

```bash
npm test          # executa uma vez
npm run test:watch # modo watch
```

Cobertura dos casos críticos:

| Suite | Casos |
|---|---|
| Detecção de conflitos | read-read (sem conflito), write-write, write-read, direção from/to |
| Componentes transitivos | cadeia A→B→C, dois pares isolados, 4 instruções independentes |
| Exemplos embutidos | multi-swap (4 componentes, contas disjuntas verificadas), chain-dependent (1 componente), complex (4 componentes, tamanhos e contas verificados) |
| Hot accounts | contagem, ordenação, ausência correta |
| parseInput | JSON válido/inválido, array vazio, campos obrigatórios |

---

## Rodar localmente

```bash
npm install
npm run dev     # http://localhost:5174
npm test        # 19 testes
```

---

## Estrutura

```
src/
  lib/
    analyzer.ts          — detecção de conflitos + Union-Find
    solanaParser.ts      — deserialização de VersionedTransaction base64
    examples.ts          — exemplos: multi-swap, chain-dependent, complex
    types.ts             — interfaces TypeScript
    colors.ts            — paleta por grupo
    __tests__/
      analyzer.test.ts   — 19 testes automatizados
  components/
    BeforeAfter.tsx      — comparação antes/depois com métrica honesta
    PartitionsList.tsx   — grupos com aviso de atomicidade + copy JSON
    DependencyGraph.tsx  — grafo de conflitos interativo (cytoscape)
    HotAccountsList.tsx  — contas mais disputadas
    SummaryCards.tsx     — strip de estatísticas
    InputPanel.tsx       — entrada de texto + exemplos rápidos
```

---

Hackathon Colosseum 2026 · Solana
