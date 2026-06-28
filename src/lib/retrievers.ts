import type { ModelsStatus, RetrieverLeg } from './types'

// Build the retriever legs to search from whatever capacity units are currently resident:
//   - one unit-routed dense leg per resident dense unit (encoder_path omitted -> the backend's
//     global dense query-encoder; M2's model panel will surface a per-unit encoder when /models
//     exposes it, making ANCE-style units correct too);
//   - a single BM25 leg if any sparse unit is resident (it reads the resident sparse index).
export function buildSearchLegs(models: ModelsStatus): RetrieverLeg[] {
  const kindOf = (name: string) => models.units.find((u) => u.name === name)?.kind
  const legs: RetrieverLeg[] = []
  for (const name of models.resident) {
    if (kindOf(name) === 'dense') legs.push({ name, query_type: 'raw', unit: name })
  }
  if (models.resident.some((n) => kindOf(n) === 'sparse')) {
    legs.push({ name: 'BM25', query_type: 'raw' })
  }
  return legs
}

// RAG needs a resident LLM; without one fall back to extractive (stitches passages, no generation).
export function chooseGeneration(models: ModelsStatus): 'rag' | 'extractive' {
  const hasLlm = models.resident.some(
    (n) => models.units.find((u) => u.name === n)?.kind === 'llm',
  )
  return hasLlm ? 'rag' : 'extractive'
}
