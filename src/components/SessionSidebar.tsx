import { useEffect, useState, type MouseEvent } from 'react'
import { api } from '../lib/api'
import type { Session } from '../lib/types'

export function SessionSidebar({
  activeId,
  onOpen,
  onDelete,
  reloadSignal,
}: {
  activeId: number | null
  onOpen: (s: Session) => void
  onDelete: (id: number) => void
  reloadSignal: number
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [renaming, setRenaming] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  async function refresh() {
    try {
      setSessions(await api.sessions())
    } catch {
      /* ignore — sidebar stays as-is */
    }
  }
  useEffect(() => {
    refresh()
  }, [reloadSignal])

  async function newChat() {
    try {
      const { id, title } = await api.createSession('New chat')
      await refresh()
      onOpen({ id, title, created_at: 0, updated_at: 0 })
    } catch {
      /* ignore */
    }
  }

  async function remove(e: MouseEvent, id: number) {
    e.stopPropagation()
    try {
      await api.deleteSession(id)
      onDelete(id) // clear the active conversation only if the delete actually succeeded
      refresh()
    } catch {
      /* keep the session listed on failure */
    }
  }

  function startRename(e: MouseEvent, s: Session) {
    e.stopPropagation()
    setRenaming(s.id)
    setDraft(s.title)
  }
  async function commitRename(id: number) {
    const t = draft.trim()
    if (t) await api.renameSession(id, t).catch(() => undefined)
    setRenaming(null)
    refresh()
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-paper/40">
      <div className="p-3">
        <button
          onClick={newChat}
          className="w-full rounded-lg bg-clay px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted">no conversations yet</p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onOpen(s)}
            className={`group mb-0.5 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm ${
              s.id === activeId ? 'bg-clay/10 text-ink' : 'text-muted hover:bg-cream'
            }`}
          >
            {renaming === s.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => e.key === 'Enter' && commitRename(s.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded border border-line bg-cream px-1 py-0.5 text-sm outline-none"
              />
            ) : (
              <>
                <span className="flex-1 truncate">{s.title || 'Untitled'}</span>
                <button
                  onClick={(e) => startRename(e, s)}
                  title="rename"
                  className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => remove(e, s.id)}
                  title="delete"
                  className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
