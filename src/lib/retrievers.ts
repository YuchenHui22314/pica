import type { ModelsStatus, RetrieverLeg } from './types'

// Build the retriever legs to search from whatever capacity units are currently resident:
//   - one unit-routed dense leg per resident dense unit (encoder_path omitted -> the backend's
//     global dense query-encoder; M2's model panel will surface a per-unit encoder when /models
//     exposes it, making ANCE-style units correct too);
//   - a single BM25 leg if any sparse unit is resident (it reads the resident sparse index).
// Query-construction options the backend understands (RetrieverSpec.query_type when qr is off).
export const QUERY_TYPES = [
  'raw',
  'full_conversation_dense',
  'qwen_conversation',
  'qwen_conversation_ptkb',
] as const
export type QueryType = (typeof QUERY_TYPES)[number]

// qtByUnit maps a unit name -> its query-formulation (chosen per-retriever in the model panel);
// missing -> 'raw'. The BM25 leg uses the resident sparse unit's choice.
export function buildSearchLegs(
  models: ModelsStatus,
  qtByUnit: Record<string, QueryType> = {},
): RetrieverLeg[] {
  const kindOf = (name: string) => models.units.find((u) => u.name === name)?.kind
  const qt = (name: string): QueryType => qtByUnit[name] ?? 'raw'
  const legs: RetrieverLeg[] = []
  for (const name of models.resident) {
    if (kindOf(name) === 'dense') legs.push({ name, query_type: qt(name), unit: name })
  }
  const sparse = models.resident.find((n) => kindOf(n) === 'sparse')
  if (sparse) legs.push({ name: 'BM25', query_type: qt(sparse) })
  return legs
}

// Generation is always RAG now: the server builds the resource-free OpenAI LLM up front, and falls
// back to extractive itself only if the LLM call errors. So /search always requests rag + citations.
