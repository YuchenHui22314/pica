import { describe, it, expect } from 'vitest'
import { nextActiveSet } from './activeSet'
import type { ModelUnit } from './types'

const u = (name: string, kind: string): ModelUnit => ({
  name,
  kind,
  resident_ram_gb: 0,
  load_peak_ram_gb: 0,
  vram_gb: 0,
  dtype: null,
  available: true,
})

const units: ModelUnit[] = [
  u('qrecc_qwen', 'dense'),
  u('qrecc_ance', 'dense'),
  u('qrecc_bm25', 'sparse'),
  u('clueweb_bm25', 'sparse'),
  u('reranker_qwen3', 'reranker'),
  u('vllm', 'llm'),
]

describe('nextActiveSet', () => {
  it('adds an absent dense unit', () => {
    expect(nextActiveSet([], 'qrecc_qwen', units)).toEqual(['qrecc_qwen'])
  })

  it('removes a unit that is already selected', () => {
    expect(nextActiveSet(['qrecc_qwen', 'qrecc_bm25'], 'qrecc_qwen', units)).toEqual(['qrecc_bm25'])
  })

  it('keeps multiple dense units (dense is not a singleton kind)', () => {
    expect(nextActiveSet(['qrecc_qwen'], 'qrecc_ance', units)).toEqual(['qrecc_qwen', 'qrecc_ance'])
  })

  it('replaces the existing sparse unit when selecting another sparse (singleton kind)', () => {
    expect(nextActiveSet(['qrecc_bm25', 'qrecc_qwen'], 'clueweb_bm25', units)).toEqual([
      'qrecc_qwen',
      'clueweb_bm25',
    ])
  })

  it('treats reranker and llm as singletons too', () => {
    const out = nextActiveSet(['reranker_qwen3'], 'vllm', units)
    expect(out).toContain('reranker_qwen3')
    expect(out).toContain('vllm')
  })
})
