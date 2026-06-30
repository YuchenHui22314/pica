import type { CSSProperties } from 'react'
import type { SearchResponse } from '../lib/types'
import { buildGrid, type GridCell } from '../lib/grid'

// Muted per-retriever hues (no green): teal, indigo, rose, violet, amber, slate.
const THEME_HUES = [188, 248, 330, 268, 32, 210]
const RANKED_HUE = 18 // warm clay-orange for the fused/reranked ranking

function hueOf(cell: GridCell, theme: number): number {
  return cell.mode === 'canonical' ? RANKED_HUE : THEME_HUES[(theme >= 0 ? theme : 0) % THEME_HUES.length]
}

// Soft, low-saturation gradient (Anthropic-muted): rank 1 deepest -> rank N palest.
function cellStyle(cell: GridCell, theme: number, topN: number): CSSProperties {
  // lightness is determined ONLY by rank (rank 1 deepest -> rank N palest) so the gradient stays
  // monotonic; cited is shown by a border + bold, NOT by darkening (which broke the gradient).
  const t = Math.min(1, cell.shade / Math.max(1, topN - 1))
  const hue = hueOf(cell, theme)
  const sat = cell.mode === 'canonical' ? 60 : 38
  const light = 50 + t * 38
  const s: CSSProperties = {
    backgroundColor: `hsl(${hue} ${sat}% ${light}%)`,
    color: light < 56 ? '#faf9f5' : '#2b2b28',
  }
  if (cell.cited) {
    s.fontWeight = 700
    s.border = `2px solid hsl(${hue} ${Math.min(72, sat + 20)}% 28%)` // darker same-hue border = cited
  }
  return s
}

function Swatch({ style }: { style: CSSProperties }) {
  return <span className="inline-block h-3 w-3 rounded-[3px]" style={style} />
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
    <details className="group rounded-xl border border-line bg-cream/60">
      <summary className="cursor-pointer select-none px-4 py-2 text-xs text-muted marker:text-line">
        view passages &amp; comparison
      </summary>
      <div className="px-4 pb-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Swatch style={{ backgroundColor: `hsl(${RANKED_HUE} 60% 60%)` }} />
            ranked (deeper = higher)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Swatch style={{ backgroundColor: `hsl(${THEME_HUES[0]} 38% 70%)` }} />
            unique to a retriever
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Swatch style={{ border: `2px solid hsl(${RANKED_HUE} 72% 30%)`, backgroundColor: 'transparent' }} />
            <span className="font-semibold text-ink">cited</span>
          </span>
          <span>· click a cell to read the passage</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {columns.map((col) => (
            <div key={col.key} className="shrink-0">
              <div
                className={`mb-1.5 w-16 truncate text-center text-[0.68rem] ${
                  col.theme < 0 ? 'font-semibold text-ink' : 'text-muted'
                }`}
                title={col.label}
              >
                {col.label}
              </div>
              <div className="flex flex-col gap-1">
                {col.cells.length === 0 && <span className="text-center text-[0.65rem] text-muted">—</span>}
                {col.cells.map((cell, i) => (
                  <button
                    key={`${cell.docid}-${i}`}
                    type="button"
                    onClick={() => onViewDoc?.(cell.docid)}
                    title={`${cell.docid}${cell.cited ? '  ·  cited' : ''}`}
                    style={cellStyle(cell, col.theme, grid.topN)}
                    className="h-7 w-16 rounded-md text-center text-xs leading-7 shadow-sm transition hover:scale-[1.06] hover:shadow"
                  >
                    {cell.number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
