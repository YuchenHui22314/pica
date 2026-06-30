import type { CSSProperties } from 'react'
import type { SearchResponse } from '../lib/types'
import { buildGrid, type GridCell } from '../lib/grid'

// Per-retriever theme hues (no green — the user finds it ugly): teal, indigo, rose, purple, amber, slate.
const THEME_HUES = [190, 255, 330, 280, 42, 215]

function cellStyle(cell: GridCell, theme: number, topN: number): CSSProperties {
  const t = Math.min(1, cell.shade / Math.max(1, topN - 1))
  let hue: number
  let sat: number
  let light: number
  if (cell.mode === 'canonical') {
    hue = 28 // warm orange = the fused/reranked ranking
    sat = 85
    light = 46 + t * 44 // rank 1 darkest -> rank N palest
  } else {
    hue = THEME_HUES[(theme >= 0 ? theme : 0) % THEME_HUES.length] // unique-to-this-retriever
    sat = 58
    light = 52 + t * 38
  }
  if (cell.cited) light = Math.max(26, light - 14) // cited -> darker
  return {
    backgroundColor: `hsl(${hue} ${sat}% ${light}%)`,
    color: light < 62 ? '#fff' : '#1a1a18',
    fontWeight: cell.cited ? 700 : 400, // cited -> bold
  }
}

export function ComparisonGrid({
  res,
  onViewDoc,
}: {
  res: SearchResponse
  onViewDoc?: (docid: string) => void
}) {
  if (res.hits.length === 0 && res.per_retriever.length === 0) return null
  const grid = buildGrid(res, 10)
  const columns = [grid.canonical, ...grid.retrievers]

  return (
    <details className="rounded-xl border border-line bg-cream">
      <summary className="cursor-pointer px-4 py-2 text-xs tracking-wide text-muted">
        view passages &amp; comparison
      </summary>
      <div className="px-4 pb-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.68rem] text-muted">
          <span>
            <b>ranked</b> = fused/reranked (dark = top)
          </span>
          <span>· orange = also in ranked (same #)</span>
          <span>· coloured = unique to that retriever (own rank)</span>
          <span>
            · <b className="text-ink">bold/dark</b> = cited
          </span>
          <span>· click to read the passage</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {columns.map((col) => (
            <div key={col.key} className="shrink-0">
              <div
                className="mb-1 w-16 truncate text-center text-[0.68rem] font-medium"
                title={col.label}
              >
                {col.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {col.cells.map((cell, i) => (
                  <button
                    key={`${cell.docid}-${i}`}
                    type="button"
                    onClick={() => onViewDoc?.(cell.docid)}
                    title={`${cell.docid}${cell.cited ? ' · cited' : ''}`}
                    style={cellStyle(cell, col.theme, grid.topN)}
                    className="h-6 w-16 rounded text-center text-xs leading-6 transition hover:ring-2 hover:ring-ink/40"
                  >
                    {cell.number}
                  </button>
                ))}
                {col.cells.length === 0 && (
                  <span className="text-center text-[0.65rem] text-muted">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
