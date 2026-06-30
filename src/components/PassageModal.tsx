import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'

// Shows a passage's full text (GET /doc?docid=). Opened by clicking a passage / comparison cell.
export function PassageModal({ docid, onClose }: { docid: string; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setText(null)
    setError('')
    api
      .doc(docid)
      .then((r) => alive && setText(r.text || '(empty passage)'))
      .catch((e) =>
        alive &&
        setError(
          e instanceof ApiError && e.status === 409
            ? 'No doc-fetch index resident — activate a BM25 / sparse unit to read passages.'
            : 'Could not load this passage.',
        ),
      )
    return () => {
      alive = false
    }
  }, [docid])

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-cream shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-3">
          <span className="break-all font-mono text-xs text-muted">{docid}</span>
          <button onClick={onClose} className="ml-auto shrink-0 text-sm text-muted hover:text-ink">
            close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : text === null ? (
            <p className="text-muted">loading…</p>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>
      </div>
    </div>
  )
}
