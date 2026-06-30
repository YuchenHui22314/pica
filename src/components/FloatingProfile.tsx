import { useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'

// A draggable + RESIZABLE floating card (drag by its header, resize from the bottom-right grip).
// Width/height are intentionally NOT in the controlled `style` object: the browser's native
// `resize` writes inline width/height, and because React never manages those keys it leaves them
// alone across re-renders (so a resize sticks while dragging still updates left/top). The body is a
// bounded flex child, so long content (e.g. a big PTKB list) gets its own scrollbar + wheel.
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
      className="fixed z-20 flex h-[28rem] w-72 flex-col overflow-hidden rounded-2xl bg-paper/95 shadow-xl ring-1 ring-line backdrop-blur"
      style={{
        left: pos.x,
        top: pos.y,
        resize: 'both',
        minWidth: 232,
        minHeight: 180,
        maxWidth: '92vw',
        maxHeight: '88vh',
      }}
    >
      <div
        onMouseDown={onDown}
        className="flex shrink-0 cursor-move select-none items-center gap-2 border-b border-line px-3 py-2"
      >
        <span className="text-muted">⠿</span>
        <span className="text-sm font-medium">{title}</span>
        <span className="ml-auto text-[0.62rem] text-muted">drag ⠿ · resize ⤡</span>
        {onClose && (
          <button onClick={onClose} className="text-sm text-muted hover:text-ink" title="hide">
            ×
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
