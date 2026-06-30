import { useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'

// A draggable, collapsible floating card (drag by its header). Used for the user-profile panel so it
// floats over the conversation and the user can move it wherever they like.
export function FloatingProfile({
  title,
  initial,
  onClose,
  children,
}: {
  title: string
  initial: { x: number; y: number }
  onClose?: () => void
  children: ReactNode
}) {
  const [pos, setPos] = useState(initial)
  const [collapsed, setCollapsed] = useState(false)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  function onDown(e: ReactMouseEvent) {
    e.preventDefault()
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    const move = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        x: Math.max(4, Math.min(window.innerWidth - 100, ev.clientX - dragRef.current.dx)),
        y: Math.max(4, Math.min(window.innerHeight - 48, ev.clientY - dragRef.current.dy)),
      })
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      className="fixed z-20 flex max-h-[78vh] w-72 flex-col overflow-hidden rounded-2xl bg-paper/95 shadow-xl ring-1 ring-line backdrop-blur"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onMouseDown={onDown}
        className="flex shrink-0 cursor-move select-none items-center gap-2 border-b border-line px-3 py-2"
      >
        <span className="text-muted">⠿</span>
        <span className="text-sm font-medium">{title}</span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto text-xs text-muted hover:text-ink"
        >
          {collapsed ? 'expand' : 'collapse'}
        </button>
        {onClose && (
          <button onClick={onClose} className="text-sm text-muted hover:text-ink" title="hide">
            ×
          </button>
        )}
      </div>
      {!collapsed && <div className="min-h-0 flex-1 overflow-hidden">{children}</div>}
    </div>
  )
}
