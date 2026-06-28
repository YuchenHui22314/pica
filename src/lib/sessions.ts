import type { CitationSpan, PerRetriever, SearchResponse, Turn } from './types'

// Rebuild a renderable SearchResponse from a persisted turn. The stored payload omits the fused
// `hits` list (see _persist_turn), so the cited `citations` map is used as the passage fallback so a
// reloaded turn still shows its supporting documents.
export function reconstructResponse(turn: Turn): SearchResponse {
  const p = turn.payload as Record<string, unknown>
  const citations = (p.citations as Record<string, number>) ?? {}
  return {
    response: turn.response,
    citations,
    hits: Object.entries(citations) as [string, number][],
    ptkb_provenance: [],
    qid: `turn-${turn.id}`,
    per_retriever: (p.per_retriever as PerRetriever[]) ?? [],
    shared_docs: (p.shared_docs as Record<string, string[]>) ?? {},
    reformulations: (p.reformulations as Record<string, string[]>) ?? {},
    citation_spans: (p.citation_spans as CitationSpan[]) ?? [],
    persisted: true,
  }
}
