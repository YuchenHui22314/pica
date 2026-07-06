// Pure logic for the per-turn navigator (ChatGPT-style tick bar).

/** Tooltip text for a tick: the turn's utterance, single-line, truncated. */
export function tickLabel(utterance: string, max = 80): string {
  const s = utterance.replace(/\s+/g, ' ').trim()
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…'
}

/**
 * The "current" turn given which turn wrappers are visible in the scroll viewport:
 * the FIRST (topmost in document order) visible turn wins; if none are visible
 * (fast scroll between long turns), keep the previous active id.
 */
export function activeTurn(order: number[], visible: Set<number>, prev: number | null): number | null {
  for (const id of order) {
    if (visible.has(id)) return id
  }
  return prev
}
