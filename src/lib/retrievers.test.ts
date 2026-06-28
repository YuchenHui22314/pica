import { describe, it, expect } from 'vitest'
import { buildSearchLegs, chooseGeneration } from './retrievers'
import type { ModelsStatus, ModelUnit } from './types'

const unit = (name: string, kind: string): ModelUnit => ({
  name,
  kind,
  resident_ram_gb: 0,
  load_peak_ram_gb: 0,
  vram_gb: 0,
  dtype: null,
  available: true,
})
const status = (units: ModelUnit[], resident: string[]): ModelsStatus => ({
  units,
  resident,
  free_ram_gb: 0,
  free_vram_gb: [],
})

describe('buildSearchLegs', () => {
  it('returns no legs when nothing is resident', () => {
    expect(buildSearchLegs(status([unit('d', 'dense'), unit('b', 'sparse')], []))).toEqual([])
  })

  it('makes a unit-routed dense leg for each resident dense unit', () => {
    expect(buildSearchLegs(status([unit('qrecc_qwen', 'dense')], ['qrecc_qwen']))).toEqual([
      { name: 'qrecc_qwen', query_type: 'raw', unit: 'qrecc_qwen' },
    ])
  })

  it('adds a single BM25 leg when a sparse unit is resident', () => {
    const m = status(
      [unit('qrecc_qwen', 'dense'), unit('qrecc_bm25', 'sparse')],
      ['qrecc_qwen', 'qrecc_bm25'],
    )
    expect(buildSearchLegs(m)).toEqual([
      { name: 'qrecc_qwen', query_type: 'raw', unit: 'qrecc_qwen' },
      { name: 'BM25', query_type: 'raw' },
    ])
  })

  it('applies the chosen query_type to every leg', () => {
    const m = status(
      [unit('qrecc_qwen', 'dense'), unit('qrecc_bm25', 'sparse')],
      ['qrecc_qwen', 'qrecc_bm25'],
    )
    expect(buildSearchLegs(m, 'full_conversation_dense')).toEqual([
      { name: 'qrecc_qwen', query_type: 'full_conversation_dense', unit: 'qrecc_qwen' },
      { name: 'BM25', query_type: 'full_conversation_dense' },
    ])
  })
})

describe('chooseGeneration', () => {
  it('uses rag when an llm unit is resident', () => {
    expect(chooseGeneration(status([unit('vllm', 'llm')], ['vllm']))).toBe('rag')
  })

  it('falls back to extractive without an llm', () => {
    expect(chooseGeneration(status([unit('d', 'dense')], ['d']))).toBe('extractive')
  })
})
