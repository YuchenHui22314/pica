import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { PtkbItem } from '../lib/types'

export function PtkbPanel({
  reloadSignal,
  extractEnabled,
  onToggleExtract,
  onClose,
}: {
  reloadSignal: number
  extractEnabled: boolean
  onToggleExtract: (on: boolean) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<PtkbItem[]>([])
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const refreshSeq = useRef(0)
  const saving = useRef(false)
  const adding = useRef(false)

  async function refresh() {
    const seq = ++refreshSeq.current // ignore an older fetch that resolves after a newer one
    try {
      const data = await api.ptkb()
      if (seq === refreshSeq.current) setItems(data)
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refresh()
  }, [reloadSignal])

  async function add() {
    if (adding.current) return // guard rapid double-submit (Enter + click) reading the same draft
    const s = draft.trim()
    if (!s) return
    adding.current = true
    setDraft('')
    await api.addPtkb(s).catch(() => undefined)
    adding.current = false
    refresh()
  }
  async function saveEdit(id: number) {
    if (saving.current) return // Enter then the unmount-blur both call saveEdit -> one PUT only
    saving.current = true
    const s = editDraft.trim()
    setEditing(null)
    if (s) await api.updatePtkb(id, s).catch(() => undefined)
    saving.current = false
    refresh()
  }
  async function remove(id: number) {
    await api.deletePtkb(id).catch(() => undefined)
    refresh()
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-line bg-paper/40">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="text-sm font-medium">User profile</span>
        <button onClick={onClose} className="ml-auto text-sm text-muted hover:text-ink">
          close
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2 border-b border-line px-4 py-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={extractEnabled}
          onChange={(e) => onToggleExtract(e.target.checked)}
          className="accent-clay"
        />
        auto-learn facts from my questions
      </label>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted">
            no profile facts yet — add what Magpie should remember about you, or turn on auto-learn.
          </p>
        )}
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className="group rounded-lg border border-line bg-cream px-3 py-2 text-sm"
            >
              {editing === it.id ? (
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveEdit(it.id)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit(it.id)}
                  className="w-full rounded border border-line bg-paper px-1 py-0.5 outline-none"
                />
              ) : (
                <div className="flex items-start gap-1">
                  <span className="flex-1">{it.statement}</span>
                  <button
                    onClick={() => {
                      setEditing(it.id)
                      setEditDraft(it.statement)
                    }}
                    title="edit"
                    className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    title="delete"
                    className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-muted">{it.source}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a fact about you…"
            className="flex-1 rounded-lg border border-line bg-cream px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-clay/40"
          />
          <button
            onClick={add}
            className="rounded-lg bg-clay px-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            +
          </button>
        </div>
      </div>
    </aside>
  )
}
