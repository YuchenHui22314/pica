import type { CitationSpan, PerRetriever, SearchResponse, Turn } from './types'

// Rebuild a renderable SearchResponse from a persisted turn. The payload now stores the full fused
// `hits` list, so a reloaded turn re-renders identically; older turns saved before that fix fall back
// to the cited `citations` map so they still show their supporting documents.
export function reconstructResponse(turn: Turn): SearchResponse {
  const p = turn.payload as Record<string, unknown>
  const citations = (p.citations as Record<string, number>) ?? {}
  return {
    response: turn.response,
    citations,
    hits: (p.hits as [string, number][]) ?? (Object.entries(citations) as [string, number][]),
    ptkb_provenance: [],
    qid: `turn-${turn.id}`,
    per_retriever: (p.per_retriever as PerRetriever[]) ?? [],
    shared_docs: (p.shared_docs as Record<string, string[]>) ?? {},
    reformulations: (p.reformulations as Record<string, string[]>) ?? {},
    citation_spans: (p.citation_spans as CitationSpan[]) ?? [],
    extracted_ptkb: (p.extracted_ptkb as string[]) ?? [],
    persisted: true,
  }
}
