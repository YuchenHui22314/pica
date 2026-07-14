import { useEffect, useRef, useState, type RefObject } from 'react'
import { activeTurn, tickLabel } from '../lib/nav'

// ChatGPT-style per-turn navigator: a slim column of ticks pinned to the conversation's right
// edge. Hover a tick -> the turn's utterance; click -> smooth-scroll to that turn. The tick of
// the topmost visible turn is highlighted (IntersectionObserver over the turn wrappers).
export function TurnNavigator({
  turns,
  scrollRef,
}: {
  turns: { id: number; utterance: string }[]
  scrollRef: RefObject<HTMLDivElement | null>
}) {
  const [active, setActive] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const visible = useRef<Set<number>>(new Set())

  useEffect(() => {
    const root = scrollRef.current
    if (!root || turns.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = Number((e.target as HTMLElement).dataset.turnId)
          if (e.isIntersecting) visible.current.add(id)
          else visible.current.delete(id)
        }
        setActive((prev) => activeTurn(turns.map((t) => t.id), visible.current, prev))
      },
      { root, threshold: 0.05 },
    )
    for (const t of turns) {
      const el = document.getElementById(`turn-${t.id}`)
      if (el) {
        el.dataset.turnId = String(t.id)
        io.observe(el)
      }
    }
    return () => io.disconnect()
  }, [turns, scrollRef])

  if (turns.length < 2) return null

  const jump = (id: number) =>
    document.getElementById(`turn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div
      className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
      onMouseEnter={() => setHover(-1)}
      onMouseLeave={() => setHover(null)}
    >
      {/* collapsed: slim tick column. hovered: the FULL turn list expands (ChatGPT-style). */}
      {hover === null ? (
        <div className="flex flex-col items-end gap-2 py-2 pl-4">
          {turns.map((t, i) => (
            <button
              key={t.id}
              aria-label={`turn ${i + 1}`}
              onClick={() => jump(t.id)}
              className={`h-[3px] rounded-full transition-all duration-150 ${
                t.id === active ? 'w-7 bg-ink' : 'w-4 bg-line'
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="max-h-[70vh] w-72 overflow-y-auto rounded-2xl bg-paper/95 p-1.5 shadow-xl ring-1 ring-line backdrop-blur">
          {turns.map((t) => (
            <button
              key={t.id}
              onClick={() => jump(t.id)}
              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition ${
                t.id === active ? 'bg-cream font-medium text-ink' : 'text-ink/80 hover:bg-cream'
              }`}
              title={t.utterance}
            >
              {tickLabel(t.utterance, 48)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
