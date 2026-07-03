import { describe, it, expect } from 'vitest'
import { buildSearchLegs, defaultSelections, familyOf } from './retrievers'
import type { EncoderChoice, ModelsStatus, ModelUnit } from './types'

const unit = (name: string, kind: string, query_encoders?: EncoderChoice[]): ModelUnit => ({
  name,
  kind,
  resident_ram_gb: 0,
  load_peak_ram_gb: 0,
  vram_gb: 0,
  dtype: null,
  available: true,
  query_encoders: query_encoders ?? null,
})
const status = (units: ModelUnit[], resident: string[]): ModelsStatus => ({
  units,
  resident,
  free_ram_gb: 0,
  free_vram_gb: [],
})

const QWEN_ENCODERS: EncoderChoice[] = [
  { label: 'Base-Qwen3-0.6B', path: '/enc/base', leg_name: 'qwen3', default_query_type: 'qwen_conversation' },
  { label: 'Conv-Qwen3-0.6B', path: '/enc/conv', leg_name: 'conv-qwen3', default_query_type: 'qwen_conversation' },
  { label: 'Pers-Conv-Qwen3-0.6B', path: '/enc/pers', leg_name: 'qwen3', default_query_type: 'qwen_conversation_ptkb' },
]

describe('familyOf', () => {
  it('derives the backend dispatch family from the unit name', () => {
    expect(familyOf('clueweb_qwen')).toBe('qwen3')
    expect(familyOf('qrecc_ance_mini')).toBe('ance')
    expect(familyOf('topiocqa_ance')).toBe('ance')
  })
})

describe('defaultSelections', () => {
  it('picks the first advertised encoder with its default query type', () => {
    expect(defaultSelections(unit('clueweb_qwen', 'dense', QWEN_ENCODERS))).toEqual([
      { path: '/enc/base', label: 'Base-Qwen3-0.6B', legName: 'qwen3', queryType: 'qwen_conversation' },
    ])
  })
  it('falls back to the name-derived family when no encoders are advertised', () => {
    expect(defaultSelections(unit('qrecc_ance_mini', 'dense'))).toEqual([
      { path: null, label: null, legName: 'ance', queryType: 'raw' },
    ])
  })
})

describe('buildSearchLegs', () => {
  it('returns no legs when nothing is resident', () => {
    expect(buildSearchLegs(status([unit('d', 'dense'), unit('b', 'sparse')], []))).toEqual([])
  })

  it('dense legs carry the model-FAMILY name (backend dispatch), not the unit name', () => {
    // regression: name=unit-name fell through _retrieve_one to NotImplementedError on the backend
    expect(buildSearchLegs(status([unit('qrecc_qwen', 'dense')], ['qrecc_qwen']))).toEqual([
      { name: 'qwen3', query_type: 'raw', unit: 'qrecc_qwen' },
    ])
  })

  it('uses the default (first) advertised encoder when there is no explicit selection', () => {
    const m = status([unit('clueweb_qwen', 'dense', QWEN_ENCODERS)], ['clueweb_qwen'])
    expect(buildSearchLegs(m)).toEqual([
      {
        name: 'qwen3',
        query_type: 'qwen_conversation',
        unit: 'clueweb_qwen',
        encoder_path: '/enc/base',
        encoder_label: 'Base-Qwen3-0.6B', // chosen ckpts are always labelled (unambiguous columns)
      },
    ])
  })

  it('drops selections whose ckpt the backend no longer advertises (stale local state)', () => {
    const m = status([unit('clueweb_qwen', 'dense', QWEN_ENCODERS)], ['clueweb_qwen'])
    const legs = buildSearchLegs(m, {
      clueweb_qwen: [
        { path: '/enc/GONE', label: 'Old', legName: 'qwen3', queryType: 'raw' },
        { path: '/enc/pers', label: 'Pers-Conv-Qwen3-0.6B', legName: 'qwen3', queryType: 'qwen_conversation_ptkb' },
      ],
    })
    expect(legs.map((l) => l.encoder_path)).toEqual(['/enc/pers'])
    // all stale -> fall back to the unit default
    const fallback = buildSearchLegs(m, {
      clueweb_qwen: [{ path: '/enc/GONE', label: 'Old', legName: 'qwen3', queryType: 'raw' }],
    })
    expect(fallback.map((l) => l.encoder_path)).toEqual(['/enc/base'])
  })

  it('emits a splade_v3 leg when a splade unit is resident', () => {
    const m = status([unit('clueweb_splade', 'splade')], ['clueweb_splade'])
    expect(buildSearchLegs(m, {}, { clueweb_splade: 'qwen_conversation' })).toEqual([
      { name: 'splade_v3', query_type: 'qwen_conversation' },
    ])
  })

  it('emits one leg per selected (encoder, query_type), labelled when several are selected', () => {
    const m = status([unit('clueweb_qwen', 'dense', QWEN_ENCODERS)], ['clueweb_qwen'])
    const legs = buildSearchLegs(m, {
      clueweb_qwen: [
        { path: '/enc/conv', label: 'Conv-Qwen3-0.6B', legName: 'conv-qwen3', queryType: 'qwen_conversation' },
        { path: '/enc/pers', label: 'Pers-Conv-Qwen3-0.6B', legName: 'qwen3', queryType: 'qwen_conversation_ptkb' },
      ],
    })
    expect(legs).toEqual([
      {
        name: 'conv-qwen3',
        query_type: 'qwen_conversation',
        unit: 'clueweb_qwen',
        encoder_path: '/enc/conv',
        encoder_label: 'Conv-Qwen3-0.6B',
      },
      {
        name: 'qwen3',
        query_type: 'qwen_conversation_ptkb',
        unit: 'clueweb_qwen',
        encoder_path: '/enc/pers',
        encoder_label: 'Pers-Conv-Qwen3-0.6B',
      },
    ])
  })

  it('adds a single BM25 leg using the sparse unit query-type choice', () => {
    const m = status(
      [unit('qrecc_qwen', 'dense'), unit('qrecc_bm25', 'sparse')],
      ['qrecc_qwen', 'qrecc_bm25'],
    )
    expect(buildSearchLegs(m, {}, { qrecc_bm25: 'qwen_conversation' })).toEqual([
      { name: 'qwen3', query_type: 'raw', unit: 'qrecc_qwen' },
      { name: 'BM25', query_type: 'qwen_conversation' },
    ])
  })
})
