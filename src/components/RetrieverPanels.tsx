import type { SearchResponse } from '../lib/types'

// A stable colour per retriever leg; shared docs show one dot per leg that also contains them.
const PALETTE = ['bg-clay', 'bg-teal', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500']

export function RetrieverPanels({
  res,
  onCite,
}: {
  res: SearchResponse
  onCite?: (docid: string) => void
}) {
  if (res.per_retriever.length === 0) return null
  const labels = res.per_retriever.map((p) => p.retriever)
  const colorIdx = (label: string) => {
    const i = labels.indexOf(label)
    return (i < 0 ? 0 : i) % PALETTE.length
  }
  const sharedCount = Object.keys(res.shared_docs).length

  return (
    <details className="rounded-xl border border-line bg-cream">
      <summary className="cursor-pointer px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
        Per-retriever comparison · {res.per_retriever.length} retrievers
        {sharedCount > 0 && ` · ${sharedCount} shared docs`}
      </summary>
      <div className="flex gap-3 overflow-x-auto px-4 pb-4">
        {res.per_retriever.map((p) => {
          const reform = res.reformulations[p.retriever]
          return (
            <div key={p.retriever} className="flex w-64 shrink-0 flex-col rounded-lg border border-line bg-paper">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PALETTE[colorIdx(p.retriever)]}`} />
                <span className="truncate text-sm font-medium" title={p.retriever}>
                  {p.retriever}
                </span>
              </div>
              {reform && reform.length > 0 && (
                <div
                  className="truncate border-b border-line px-3 py-1.5 text-xs italic text-muted"
                  title={reform.join('  |  ')}
                >
                  “{reform.join('  |  ')}”
                </div>
              )}
              <ol className="max-h-72 space-y-0.5 overflow-y-auto p-2">
                {p.hits.map(([docid, score], i) => {
                  const alsoIn = (res.shared_docs[docid] ?? []).filter((l) => l !== p.retriever)
                  return (
                    <li
                      key={`${docid}-${i}`}
                      onClick={() => onCite?.(docid)}
                      title={docid}
                      className={`cursor-pointer rounded px-2 py-1 text-xs hover:bg-cream ${
                        alsoIn.length > 0 ? 'bg-clay/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-muted">{i + 1}.</span>
                        <span className="flex-1 truncate font-mono">{docid}</span>
                        <span className="text-muted">{score.toFixed(2)}</span>
                      </div>
                      {alsoIn.length > 0 && (
                        <div className="mt-0.5 flex items-center gap-1 pl-4">
                          <span className="text-[0.65rem] text-muted">also in</span>
                          {alsoIn.map((l) => (
                            <span
                              key={l}
                              title={l}
                              className={`h-2 w-2 rounded-full ${PALETTE[colorIdx(l)]}`}
                            />
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          )
        })}
      </div>
    </details>
  )
}
