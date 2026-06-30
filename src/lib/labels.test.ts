import { describe, it, expect } from 'vitest'
import { corpusLabel, modelLabel } from './labels'
import type { ModelUnit } from './types'

const u = (name: string, kind: string): ModelUnit => ({
  name,
  kind,
  corpus: null,
  resident_ram_gb: 0,
  load_peak_ram_gb: 0,
  vram_gb: 0,
  dtype: null,
  available: true,
})

describe('corpusLabel', () => {
  it('formal corpus names', () => {
    expect(corpusLabel('clueweb')).toBe('ClueWeb-22B')
    expect(corpusLabel('qrecc')).toBe('QReCC')
    expect(corpusLabel('topiocqa')).toBe('TopiOCQA')
    expect(corpusLabel(null)).toBe('Other')
  })
})

describe('modelLabel', () => {
  it('formal model names (no informal lowercase)', () => {
    expect(modelLabel(u('qrecc_ance', 'dense'))).toBe('ANCE')
    expect(modelLabel(u('clueweb_qwen', 'dense'))).toBe('Qwen3-Embedding-0.6B')
    expect(modelLabel(u('qrecc_bm25', 'sparse'))).toBe('BM25')
    expect(modelLabel(u('clueweb_splade', 'splade'))).toBe('SPLADE-v3')
    expect(modelLabel(u('reranker_qwen3', 'reranker'))).toBe('Qwen3-Reranker')
  })
})
