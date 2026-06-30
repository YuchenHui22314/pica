import type { SearchResponse } from '../lib/types'
import { CitedResponse } from '../lib/citations'
import { ComparisonGrid } from './ComparisonGrid'

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-clay/10 px-4 py-2 text-ink">{text}</div>
    </div>
  )
}

// The answer rendered as a speech bubble "spoken" by the magpie (head avatar on the left). The
// passages/comparison foldable sits to the RIGHT of the bubble; the per-turn 'learned' line below it.
export function AssistantTurn({
  res,
  onViewDoc,
  extractOn,
}: {
  res: SearchResponse
  onViewDoc?: (docid: string) => void
  extractOn?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <img
        src="/rali_pica_head.png"
        alt="Magpie"
        className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-line"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-start lg:gap-4">
        <div className="min-w-0 lg:max-w-2xl lg:shrink">
          <div className="rounded-2xl rounded-tl-sm bg-paper px-5 py-4 ring-1 ring-line">
            <CitedResponse text={res.response} spans={res.citation_spans} onCite={onViewDoc} />
          </div>
          {extractOn && (
            <p className="mt-1.5 pl-1 text-xs italic text-muted">
              {res.extracted_ptkb && res.extracted_ptkb.length > 0
                ? `🪶 learned: ${res.extracted_ptkb.map((f) => `“${f}”`).join('  ·  ')}`
                : '🪶 no new profile facts this turn'}
            </p>
          )}
        </div>
        <div className="min-w-0 lg:flex-1">
          <ComparisonGrid res={res} onViewDoc={onViewDoc} />
        </div>
      </div>
    </div>
  )
}
