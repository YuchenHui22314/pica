import { useEffect, useRef, useState } from 'react'
import { api, ApiError, getToken, setToken } from './lib/api'
import { buildSearchLegs, chooseGeneration } from './lib/retrievers'
import type { ModelsStatus, SearchResponse, User } from './lib/types'
import { Login } from './components/Login'
import { Composer } from './components/Composer'
import { AssistantTurn, UserBubble } from './components/MessageTurn'

type Msg = { id: number; utterance: string; res?: SearchResponse; error?: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [models, setModels] = useState<ModelsStatus | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const nextId = useRef(0)

  // restore a session from a stored token. req() already drops the token on 401, so DON'T blanket
  // clear here — a transient 500/network error must keep the token so a reload can retry.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => undefined)
      .finally(() => setChecking(false))
  }, [])

  // load model residency once signed in
  useEffect(() => {
    if (user) api.models().then(setModels).catch(() => undefined)
  }, [user])

  async function send(utterance: string) {
    if (inFlight.current) return // synchronous guard: stale `busy` can't gate rapid double-submits
    inFlight.current = true
    setBusy(true)
    const id = nextId.current++
    const history = msgs.flatMap((m) => (m.res ? [m.utterance, m.res.response] : []))
    setMsgs((m) => [...m, { id, utterance }])
    const update = (patch: Partial<Msg>) =>
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    try {
      const status = models ?? (await api.models().catch(() => null))
      if (status) setModels(status)
      if (!status) {
        update({ error: '无法获取模型状态（后端未连接？）。' })
        return
      }
      const retrievers = buildSearchLegs(status)
      if (retrievers.length === 0) {
        update({ error: '没有激活的检索器。先激活一个 unit（模型面板在 M2；暂时可 POST /activate）。' })
        return
      }
      const res = await api.search({
        utterance,
        history,
        retrievers,
        generation: chooseGeneration(status),
      })
      update({ res })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setModels(null)
      }
      update({ error: err instanceof Error ? err.message : 'search failed' })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function signOut() {
    api.logout().catch(() => undefined)
    setToken(null)
    setUser(null)
    setModels(null)
    setMsgs([])
  }

  if (checking) return <div className="grid min-h-full place-items-center text-muted">…</div>
  if (!user) return <Login onLoggedIn={setUser} />

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <img src="/pica-logo.svg" width={28} height={28} alt="" />
        <span className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          Magpie
        </span>
        {models && (
          <span className="ml-3 truncate text-xs text-muted">
            {models.resident.length > 0
              ? `resident: ${models.resident.join(', ')}`
              : 'no models active'}
          </span>
        )}
        <span className="ml-auto text-sm text-muted">{user.username}</span>
        <button onClick={signOut} className="text-sm text-muted hover:text-ink">
          sign out
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {msgs.length === 0 && (
          <p className="mt-10 text-center text-muted">
            Ask Magpie anything — it'll fetch the brightest passages.
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className="space-y-3">
            <UserBubble text={m.utterance} />
            {m.res ? (
              <AssistantTurn res={m.res} turnKey={m.id} />
            ) : m.error ? (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{m.error}</div>
            ) : (
              <div className="text-sm text-muted">searching…</div>
            )}
          </div>
        ))}
      </div>

      <Composer onSend={send} busy={busy} />
    </div>
  )
}
