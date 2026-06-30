import type { SearchResponse } from './types'

// One cell in the unified comparison grid (a document in a column's top-N).
export type GridCell = {
  docid: string
  number: number // rank to display (1-based)
  mode: 'canonical' | 'own' // canonical = present in the ranked list; own = unique to this retriever
  shade: number // 0-based depth for the colour gradient (canonical rank, or own rank)
  cited: boolean
}
export type GridColumn = { key: string; label: string; theme: number; cells: GridCell[] }
export type Grid = { canonical: GridColumn; retrievers: GridColumn[]; topN: number }

// Build the merged "passages & comparison" grid. The CANONICAL column is the fused/reranked `hits`
// (top-N), coloured by rank with a warm gradient. Each retriever column shows its own top-N: a doc
// that is also in the canonical top-N takes the canonical rank + shade (so its colours come out
// "scrambled" relative to that retriever's order); a doc unique to the retriever takes that
// retriever's own theme colour + its own rank. Cited docs are flagged (rendered darker + bold).
export function buildGrid(res: SearchResponse, topN = 10): Grid {
  const cited = new Set(res.citation_spans.map((s) => s.docid))
  const canonDocs = res.hits.slice(0, topN).map(([d]) => d)
  const canonRank = new Map<string, number>()
  canonDocs.forEach((d, i) => canonRank.set(d, i))

  const canonical: GridColumn = {
    key: '__ranked__',
    label: 'ranked',
    theme: -1,
    cells: canonDocs.map((d, i) => ({
      docid: d,
      number: i + 1,
      mode: 'canonical',
      shade: i,
      cited: cited.has(d),
    })),
  }

  const retrievers = res.per_retriever.map(
    (p, ti): GridColumn => ({
      key: p.retriever,
      label: p.retriever,
      theme: ti,
      cells: p.hits.slice(0, topN).map(([d], j): GridCell => {
        const cr = canonRank.get(d)
        return cr != null
          ? { docid: d, number: cr + 1, mode: 'canonical', shade: cr, cited: cited.has(d) }
          : { docid: d, number: j + 1, mode: 'own', shade: j, cited: cited.has(d) }
      }),
    }),
  )

  return { canonical, retrievers, topN }
}
