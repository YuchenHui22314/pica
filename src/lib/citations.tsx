import type { CitationSpan } from './types'

export type CitedSegment =
  | { kind: 'text'; text: string }
  | { kind: 'cite'; n: number; docid: string }

// Pure: turn an answer + its citation_spans into ordered segments. Each [n] marker (the chars
// text.slice(start,end)) is replaced by a cite segment; text between/around markers is preserved.
// Spans are sorted by start; any span that overlaps an already-consumed region is dropped (defensive
// against bad offsets). Tested in citations.test.ts.
export function splitWithCitations(text: string, spans: CitationSpan[]): CitedSegment[] {
  if (!spans.length) return [{ kind: 'text', text }]
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const out: CitedSegment[] = []
  let cursor = 0
  for (const s of sorted) {
    if (s.start < cursor) continue // overlapping / out-of-order marker
    if (s.start > cursor) out.push({ kind: 'text', text: text.slice(cursor, s.start) })
    out.push({ kind: 'cite', n: s.n, docid: s.docid })
    cursor = s.end
  }
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) })
  return out
}

// Render an answer with inline [n] markers as clickable chips that jump to the cited passage
// (Onyx/Perplexica pattern). Presentational wrapper over the tested splitWithCitations.
export function CitedResponse({
  text,
  spans,
  onCite,
}: {
  text: string
  spans: CitationSpan[]
  onCite?: (docid: string) => void
}) {
  const segments = splitWithCitations(text, spans)
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onCite?.(seg.docid)}
            title={seg.docid}
            className="mx-0.5 align-super text-[0.72em] font-semibold text-clay hover:underline"
          >
            [{seg.n}]
          </button>
        ),
      )}
    </p>
  )
}
