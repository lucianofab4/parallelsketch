interface Props {
  accounts: { pubkey: string; writeCount: number }[]
}

export default function HotAccountsList({ accounts }: Props) {
  const max = accounts[0]?.writeCount ?? 1

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 animate-fade-in stagger-3">
      <div className="flex items-center gap-2 mb-4">
        <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
        <h3 className="text-sm font-bold text-slate-200">Contas Quentes</h3>
        <span className="ml-auto text-xs text-slate-600">write-lock disputado</span>
      </div>

      <div className="space-y-3">
        {accounts.slice(0, 6).map((acc, i) => (
          <div key={acc.pubkey} className="flex items-center gap-3">
            {/* Rank badge */}
            <span className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              i === 0 ? 'bg-red-500/20 text-red-400'
              : i === 1 ? 'bg-orange-500/20 text-orange-400'
              : 'bg-slate-800 text-slate-500'
            }`}>
              {i + 1}
            </span>

            {/* Account name */}
            <span
              className="font-mono text-sm font-medium text-slate-200 truncate flex-1 min-w-0"
              title={acc.pubkey}
            >
              {acc.pubkey}
            </span>

            {/* Bar + count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-700"
                  style={{ width: `${(acc.writeCount / max) * 100}%` }}
                />
              </div>
              <span className={`text-sm font-bold w-7 text-right flex-shrink-0 ${
                i === 0 ? 'text-red-400' : 'text-orange-400'
              }`}>
                {acc.writeCount}×
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
