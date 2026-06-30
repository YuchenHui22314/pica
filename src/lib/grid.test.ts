import { describe, it, expect } from 'vitest'
import { buildGrid } from './grid'
import type { SearchResponse } from './types'

const res = (over: Partial<SearchResponse>): SearchResponse => ({
  response: '',
  citations: {},
  hits: [],
  ptkb_provenance: [],
  qid: 'q',
  per_retriever: [],
  shared_docs: {},
  reformulations: {},
  citation_spans: [],
  persisted: false,
  ...over,
})

describe('buildGrid', () => {
  it('canonical column = the fused/reranked hits, 1..N with cited flag', () => {
    const g = buildGrid(
      res({
        hits: [
          ['a', 9],
          ['b', 8],
          ['c', 7],
        ],
        citation_spans: [{ n: 1, docid: 'a', start: 0, end: 3 }],
      }),
    )
    expect(g.canonical.cells).toEqual([
      { docid: 'a', number: 1, mode: 'canonical', shade: 0, cited: true },
      { docid: 'b', number: 2, mode: 'canonical', shade: 1, cited: false },
      { docid: 'c', number: 3, mode: 'canonical', shade: 2, cited: false },
    ])
  })

  it('a retriever cell in the canonical list takes the canonical rank+shade (scrambled order)', () => {
    const g = buildGrid(
      res({
        hits: [
          ['a', 9],
          ['b', 8],
          ['c', 7],
        ],
        per_retriever: [
          {
            retriever: 'BM25',
            hits: [
              ['b', 5],
              ['a', 4],
              ['x', 3],
            ],
          },
        ],
        citation_spans: [{ n: 1, docid: 'a', start: 0, end: 1 }],
      }),
    )
    const col = g.retrievers[0]
    expect(col.theme).toBe(0)
    // b -> canonical rank 2 ; a -> canonical rank 1 (cited) ; x -> own rank 1 (unique to BM25)
    expect(col.cells[0]).toEqual({ docid: 'b', number: 2, mode: 'canonical', shade: 1, cited: false })
    expect(col.cells[1]).toEqual({ docid: 'a', number: 1, mode: 'canonical', shade: 0, cited: true })
    // x is unique to BM25 and is its 3rd hit -> own mode, its own rank (3)
    expect(col.cells[2]).toEqual({ docid: 'x', number: 3, mode: 'own', shade: 2, cited: false })
  })

  it('honours topN', () => {
    const g = buildGrid(
      res({ hits: [['a', 3], ['b', 2], ['c', 1]] }),
      2,
    )
    expect(g.canonical.cells.map((c) => c.docid)).toEqual(['a', 'b'])
  })
})
