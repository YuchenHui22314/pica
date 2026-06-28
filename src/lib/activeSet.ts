import type { ModelUnit } from './types'

// Singleton kinds: the backend keeps exactly one resident instance of each (mirrors
// pipeline._SINGLETON_KINDS). Dense indexes are NOT singletons — several can be active at once.
const SINGLETON_KINDS = new Set(['sparse', 'splade', 'reranker', 'llm'])

// Toggle `unit` in the desired active set. Removing is plain. Adding a singleton-kind unit first
// evicts any other unit of that same kind, so the desired set is always backend-valid by
// construction (the one-corpus rule still can't be checked client-side -> the backend 400s on it).
export function nextActiveSet(current: string[], unit: string, units: ModelUnit[]): string[] {
  if (current.includes(unit)) return current.filter((u) => u !== unit)
  const kindOf = (name: string) => units.find((x) => x.name === name)?.kind
  const kind = kindOf(unit)
  const base =
    kind && SINGLETON_KINDS.has(kind)
      ? current.filter((u) => kindOf(u) !== kind)
      : current
  return [...base, unit]
}
