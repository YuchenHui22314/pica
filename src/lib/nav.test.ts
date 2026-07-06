import { describe, expect, it } from 'vitest'
import { activeTurn, tickLabel } from './nav'

describe('tickLabel', () => {
  it('collapses whitespace and passes short text through', () => {
    expect(tickLabel('  where   is\nmontreal? ')).toBe('where is montreal?')
  })
  it('truncates long text with an ellipsis at the limit', () => {
    const long = 'x'.repeat(200)
    const out = tickLabel(long, 80)
    expect(out.length).toBe(80)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('activeTurn', () => {
  it('picks the topmost visible turn in document order', () => {
    expect(activeTurn([1, 2, 3], new Set([2, 3]), null)).toBe(2)
  })
  it('keeps the previous active when nothing is visible', () => {
    expect(activeTurn([1, 2, 3], new Set(), 3)).toBe(3)
  })
  it('returns null when nothing visible and no previous', () => {
    expect(activeTurn([1, 2], new Set(), null)).toBeNull()
  })
})
