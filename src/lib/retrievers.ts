import type { ModelsStatus, ModelUnit, RetrieverLeg } from './types'

// Build the retriever legs to search from whatever capacity units are currently resident:
//   - per resident dense unit, one leg PER SELECTED query-encoder (each with its own query_type) —
//     several encoders share one resident doc index (the backend groups them into ONE corpus pass);
//   - a single BM25 leg if any sparse unit is resident (it reads the resident sparse index).
// IMPORTANT: a dense leg's `name` is the backend DISPATCH FAMILY (ance | conv-ance | qwen3 |
// conv-qwen3), never the unit name (the unit rides in `unit`); a unit-named leg used to fall
// through the backend dispatch to NotImplementedError.
export const QUERY_TYPES = [
  'raw',
  'full_conversation_dense',
  'qwen_conversation',
  'qwen_conversation_ptkb',
] as const
export type QueryType = (typeof QUERY_TYPES)[number]

// One chosen encoder on a unit + the query formulation to use with it.
export interface EncoderSel {
  path: string | null // checkpoint dir; null -> let the backend use the unit's default encoder
  label: string | null // display label (null for the implicit default)
  legName: string // backend dispatch family
  queryType: QueryType
}

// Derive the base dispatch family from a unit name — the fallback when /models advertises no
// encoder list, where the unit's default encoder IS the base one (conv-* variants are only
// reachable through advertised choices).
export function familyOf(unitName: string): string {
  return unitName.includes('qwen') ? 'qwen3' : 'ance'
}

// Guard backend-provided query types (typed as plain strings) against typos/new values.
export function asQueryType(s: string | undefined): QueryType {
  return QUERY_TYPES.includes(s as QueryType) ? (s as QueryType) : 'raw'
}

// The selection used when the user hasn't touched a unit: its first advertised encoder (the base)
// with that encoder's default query formulation.
export function defaultSelections(unit: ModelUnit): EncoderSel[] {
  const first = unit.query_encoders?.[0]
  if (first) {
    return [
      {
        path: first.path,
        label: first.label,
        legName: first.leg_name,
        queryType: asQueryType(first.default_query_type),
      },
    ]
  }
  return [{ path: null, label: null, legName: familyOf(unit.name), queryType: 'raw' }]
}

// denseSel maps a dense unit -> its selected encoders (each with a query type); missing -> the
// unit's default selection. qtByUnit keeps the per-unit query_type choice for sparse/splade legs.
export function buildSearchLegs(
  models: ModelsStatus,
  denseSel: Record<string, EncoderSel[]> = {},
  qtByUnit: Record<string, QueryType> = {},
): RetrieverLeg[] {
  const unitOf = (name: string) => models.units.find((u) => u.name === name)
  const legs: RetrieverLeg[] = []
  for (const name of models.resident) {
    const u = unitOf(name)
    if (u?.kind !== 'dense') continue
    // untouched unit -> its default selection; an explicit empty array means "no legs from it"
    let sels = name in denseSel ? denseSel[name] : defaultSelections(u)
    if (u.query_encoders?.length) {
      // drop selections whose ckpt the backend no longer advertises (stale local state after a
      // backend config change); if none survive, fall back to the unit's default
      const known = new Set(u.query_encoders.map((c) => c.path))
      const kept = sels.filter((s) => s.path !== null && known.has(s.path))
      if (kept.length !== sels.length) sels = kept.length ? kept : defaultSelections(u)
    }
    for (const sel of sels) {
      const leg: RetrieverLeg = { name: sel.legName, query_type: sel.queryType, unit: name }
      if (sel.path) leg.encoder_path = sel.path
      if (sel.label) leg.encoder_label = sel.label // ALWAYS label chosen ckpts (unambiguous columns)
      legs.push(leg)
    }
  }
  const sparse = models.resident.find((n) => unitOf(n)?.kind === 'sparse')
  if (sparse) legs.push({ name: 'BM25', query_type: qtByUnit[sparse] ?? 'raw' })
  const splade = models.resident.find((n) => unitOf(n)?.kind === 'splade')
  if (splade) legs.push({ name: 'splade_v3', query_type: qtByUnit[splade] ?? 'raw' })
  return legs
}

// Generation is always RAG now: the server builds the resource-free OpenAI LLM up front, and falls
// back to extractive itself only if the LLM call errors. So /search always requests rag + citations.
