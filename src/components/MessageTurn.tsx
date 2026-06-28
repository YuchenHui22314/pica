import { useEffect, useRef, useState } from 'react'
import type { SearchResponse } from '../lib/types'
import { CitedResponse } from '../lib/citations'
import { RetrieverPanels } from './RetrieverPanels'

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-clay/10 px-4 py-2 text-ink">{text}</div>
    </div>
  )
}

export function AssistantTurn({ res, turnKey }: { res: SearchResponse; turnKey: number | string }) {
  const cited = new Set(res.citation_spans.map((s) => s.docid))
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  // turnKey makes the passage id unique even if the backend reuses a qid across turns.
  // getElementById matches the literal id string (no selector parsing), so raw docids are safe.
  const docElemId = (docid: string) => `doc-${turnKey}-${res.qid}-${docid}`
  const scrollToDoc = (docid: string) => {
    const el = document.getElementById(docElemId(docid))
    if (!el) return // doc isn't in the fused top-20 (e.g. a per-retriever-only hit): don't false-flash
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(docid)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1300)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-paper px-5 py-4 ring-1 ring-line">
        <CitedResponse text={res.response} spans={res.citation_spans} onCite={scrollToDoc} />
      </div>

      {res.hits.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Top passages</div>
          <ol className="space-y-1">
            {res.hits.slice(0, 20).map(([docid, score], i) => (
              <li
                key={`${docid}-${i}`}
                id={docElemId(docid)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  cited.has(docid) ? 'border-clay/40 bg-clay/5' : 'border-line bg-cream'
                } ${flash === docid ? 'ring-2 ring-clay' : ''}`}
              >
                <span className="mr-2 text-muted">{i + 1}.</span>
                <span className="break-all font-mono text-xs">{docid}</span>
                <span className="ml-2 text-xs text-muted">{score.toFixed(3)}</span>
                {cited.has(docid) && (
                  <span className="ml-2 rounded bg-clay/15 px-1.5 text-[0.7em] font-semibold text-clay">
                    cited
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <RetrieverPanels res={res} onCite={scrollToDoc} />
    </div>
  )
}
