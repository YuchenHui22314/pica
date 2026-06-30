import type { ModelUnit } from './types'

const CORPUS: Record<string, string> = {
  clueweb: 'ClueWeb-22B',
  qrecc: 'QReCC',
  topiocqa: 'TopiOCQA',
}

export function corpusLabel(corpus: string | null | undefined): string {
  if (!corpus) return 'Other'
  return CORPUS[corpus] ?? corpus
}

// Formal, properly-cased model name for display (no informal lowercase unit ids).
export function modelLabel(unit: ModelUnit): string {
  if (unit.kind === 'reranker') return 'Qwen3-Reranker'
  const n = unit.name.toLowerCase()
  if (n.includes('splade')) return 'SPLADE-v3'
  if (n.includes('bm25')) return 'BM25'
  if (n.includes('qwen')) return 'Qwen3-Embedding-0.6B'
  if (n.includes('ance')) return 'ANCE'
  return unit.name
}
