import { describe, it, expect } from 'vitest'
import { splitWithCitations } from './citations'
import type { CitationSpan } from './types'

const span = (n: number, docid: string, start: number, end: number): CitationSpan => ({
  n,
  docid,
  start,
  end,
})

describe('splitWithCitations', () => {
  it('returns one text segment when there are no spans', () => {
    expect(splitWithCitations('hello world', [])).toEqual([{ kind: 'text', text: 'hello world' }])
  })

  it('splits text around a single [n] marker, replacing the marker with a cite segment', () => {
    const text = 'the sky is blue [1].' // "[1]" occupies chars 16..19
    expect(splitWithCitations(text, [span(1, 'docA', 16, 19)])).toEqual([
      { kind: 'text', text: 'the sky is blue ' },
      { kind: 'cite', n: 1, docid: 'docA' },
      { kind: 'text', text: '.' },
    ])
  })

  it('omits an empty trailing text segment when a marker ends the string', () => {
    const text = 'done [2]' // "[2]" at 5..8, end of string
    expect(splitWithCitations(text, [span(2, 'docB', 5, 8)])).toEqual([
      { kind: 'text', text: 'done ' },
      { kind: 'cite', n: 2, docid: 'docB' },
    ])
  })

  it('handles multiple ordered markers', () => {
    const text = 'a [1] b [2] c'
    expect(splitWithCitations(text, [span(1, 'd1', 2, 5), span(2, 'd2', 8, 11)])).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'cite', n: 1, docid: 'd1' },
      { kind: 'text', text: ' b ' },
      { kind: 'cite', n: 2, docid: 'd2' },
      { kind: 'text', text: ' c' },
    ])
  })

  it('sorts unordered spans by start before splitting', () => {
    const text = 'a [1] b [2] c'
    // pass the second span first — must still come out in reading order
    expect(splitWithCitations(text, [span(2, 'd2', 8, 11), span(1, 'd1', 2, 5)])).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'cite', n: 1, docid: 'd1' },
      { kind: 'text', text: ' b ' },
      { kind: 'cite', n: 2, docid: 'd2' },
      { kind: 'text', text: ' c' },
    ])
  })

  it('drops an overlapping span (defensive against bad offsets)', () => {
    const text = 'x [1][2] y'
    const out = splitWithCitations(text, [span(1, 'd1', 2, 5), span(2, 'd2', 3, 6)])
    expect(out.filter((s) => s.kind === 'cite')).toHaveLength(1)
  })
})
