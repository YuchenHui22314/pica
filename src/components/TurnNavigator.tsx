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

  return (
    <div className="pointer-events-none absolute right-2 top-1/2 z-20 -translate-y-1/2">
      <div className="pointer-events-auto flex flex-col items-end gap-2 py-2">
        {turns.map((t, i) => {
          const on = t.id === (hover ?? active)
          return (
            <div key={t.id} className="relative flex items-center">
              {hover === t.id && (
                <span className="absolute right-8 max-w-72 whitespace-nowrap rounded-lg bg-paper px-3 py-1.5 text-xs text-ink shadow-lg ring-1 ring-line">
                  <span className="mr-1.5 text-muted">#{i + 1}</span>
                  {tickLabel(t.utterance)}
                </span>
              )}
              <button
                aria-label={`turn ${i + 1}`}
                onMouseEnter={() => setHover(t.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() =>
                  document
                    .getElementById(`turn-${t.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className={`h-[3px] rounded-full transition-all duration-150 ${
                  on ? 'w-7 bg-ink' : 'w-4 bg-line hover:bg-muted'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
