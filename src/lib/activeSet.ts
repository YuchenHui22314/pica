import type { ModelUnit } from './types'

// Singleton kinds: the backend keeps exactly one resident instance of each (mirrors
// pipeline._SINGLETON_KINDS). Dense indexes are NOT singletons — several can be active at once.
const SINGLETON_KINDS = new Set(['sparse', 'splade', 'reranker', 'llm'])
const RETRIEVAL_KINDS = new Set(['dense', 'sparse', 'splade']) // corpus-bound (reranker/llm are not)

// Toggle `unit` in the desired active set. Removing is plain. Adding enforces the backend's two
// rules so the set is always valid by construction: (a) ONE corpus per active set — adding a
// retrieval unit of a new corpus drops the other corpus's retrieval units (corpus-agnostic units
// like the reranker are kept); (b) at most ONE unit per singleton kind (sparse/splade/reranker/llm).
export function nextActiveSet(current: string[], unit: string, units: ModelUnit[]): string[] {
  if (current.includes(unit)) return current.filter((u) => u !== unit)
  const find = (name: string) => units.find((x) => x.name === name)
  const kind = find(unit)?.kind
  const corpus = find(unit)?.corpus ?? null
  let base = current
  if (kind && RETRIEVAL_KINDS.has(kind) && corpus != null) {
    base = base.filter((u) => {
      const f = find(u)
      if (!f?.kind || !RETRIEVAL_KINDS.has(f.kind)) return true // keep corpus-agnostic units
      return (f.corpus ?? null) === corpus // keep same-corpus retrieval only
    })
  }
  if (kind && SINGLETON_KINDS.has(kind)) {
    base = base.filter((u) => find(u)?.kind !== kind)
  }
  return [...base, unit]
}
