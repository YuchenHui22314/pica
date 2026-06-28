import { describe, it, expect } from 'vitest'
import { reconstructResponse } from './sessions'
import type { Turn } from './types'

const turn = (over: Partial<Turn>): Turn => ({
  id: 1,
  idx: 0,
  utterance: 'q',
  response: 'a',
  payload: {},
  created_at: 0,
  ...over,
})

describe('reconstructResponse', () => {
  it('defaults everything from an empty payload (no stored passages)', () => {
    const r = reconstructResponse(turn({ response: 'hi' }))
    expect(r.response).toBe('hi')
    expect(r.hits).toEqual([])
    expect(r.citation_spans).toEqual([])
    expect(r.per_retriever).toEqual([])
    expect(r.persisted).toBe(true)
  })

  it('maps the stored payload and falls back to citations for the passage list', () => {
    const r = reconstructResponse(
      turn({
        response: 'the sky is blue [1]',
        payload: {
          citations: { docA: 0.9, docB: 0.5 },
          citation_spans: [{ n: 1, docid: 'docA', start: 16, end: 19 }],
          per_retriever: [{ retriever: 'BM25', hits: [['docA', 1.2]] }],
          shared_docs: { docA: ['BM25', 'qwen'] },
          reformulations: { qwen: ['blue sky'] },
        },
      }),
    )
    expect(r.hits).toEqual([
      ['docA', 0.9],
      ['docB', 0.5],
    ])
    expect(r.citation_spans).toHaveLength(1)
    expect(r.per_retriever[0].retriever).toBe('BM25')
    expect(r.shared_docs.docA).toEqual(['BM25', 'qwen'])
  })

  it('prefers the stored payload.hits over the citations fallback', () => {
    const r = reconstructResponse(
      turn({ payload: { citations: { docA: 0.9 }, hits: [['docX', 2.1], ['docY', 1.0]] } }),
    )
    expect(r.hits).toEqual([
      ['docX', 2.1],
      ['docY', 1.0],
    ])
  })
})
