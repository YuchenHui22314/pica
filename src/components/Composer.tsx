import { useState, type FormEvent } from 'react'

export function Composer({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || busy) return
    onSend(v)
    setText('')
  }

  return (
    <div className="border-t border-line bg-cream/80 backdrop-blur">
      <form onSubmit={submit} className="mx-auto flex max-w-6xl items-end gap-2 p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Magpie…"
          disabled={busy}
          className="flex-1 rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:ring-2 focus:ring-clay/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-xl bg-clay px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
