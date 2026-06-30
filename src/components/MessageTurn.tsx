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

// The assistant's answer rendered as a speech bubble "spoken" by the magpie (avatar on the left).
export function AssistantTurn({
  res,
  onViewDoc,
}: {
  res: SearchResponse
  onViewDoc?: (docid: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <img
          src="/rali_pica.png"
          alt="Magpie"
          className="mt-1 h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-line"
        />
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-paper px-5 py-4 ring-1 ring-line">
          <CitedResponse text={res.response} spans={res.citation_spans} onCite={onViewDoc} />
        </div>
      </div>
      <div className="pl-12">
        <ComparisonGrid res={res} onViewDoc={onViewDoc} />
      </div>
    </div>
  )
}
