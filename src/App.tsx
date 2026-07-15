import { useEffect, useRef, useState } from 'react'
import { api, ApiError, getToken, setToken } from './lib/api'
import { buildSearchLegs, type EncoderSel, type QueryType } from './lib/retrievers'
import { reconstructResponse } from './lib/sessions'
import type { ModelsStatus, SearchResponse, Session, User } from './lib/types'
import { Login } from './components/Login'
import { Composer } from './components/Composer'
import { AssistantTurn, UserBubble } from './components/MessageTurn'
import { ModelPanel } from './components/ModelPanel'
import { SessionSidebar } from './components/SessionSidebar'
import { PtkbPanel } from './components/PtkbPanel'
import { PassageModal } from './components/PassageModal'
import { TurnNavigator } from './components/TurnNavigator'
import { FloatingProfile } from './components/FloatingProfile'

type Msg = { id: number; utterance: string; res?: SearchResponse; error?: string; extractOn?: boolean }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [models, setModels] = useState<ModelsStatus | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [showModels, setShowModels] = useState(false)
  const [reloadSignal, setReloadSignal] = useState(0)
  const [legQueryTypes, setLegQueryTypes] = useState<Record<string, QueryType>>({})
  // per dense unit: which query-encoder ckpts are selected (each with its own query formulation)
  const [encoderSels, setEncoderSels] = useState<Record<string, EncoderSel[]>>({})
  // units toggled OUT of retrieval (stay resident for doc-fetch; contribute no search leg)
  const [searchOff, setSearchOff] = useState<Record<string, boolean>>({})
  const [extractPtkb, setExtractPtkb] = useState(true) // auto-learn PTKB on by default
  const [ptkbReload, setPtkbReload] = useState(0)
  const [viewDocid, setViewDocid] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showPtkb, setShowPtkb] = useState(true)
  const inFlight = useRef(false)
  const nextId = useRef(0)
  const convGen = useRef(0) // bumped on every conversation switch; guards stale async commits

  // restore a session from a stored token. req() drops the token on 401, so don't blanket-clear here.
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

  useEffect(() => {
    if (user) api.models().then(setModels).catch(() => undefined)
  }, [user])

  async function openSession(s: Session) {
    const gen = ++convGen.current // switching conversation: invalidate any in-flight commits
    setActiveSessionId(s.id)
    setShowModels(false)
    try {
      const turns = await api.sessionTurns(s.id)
      if (gen !== convGen.current) return // a newer switch won; drop this stale load
      nextId.current = turns.reduce((mx, t) => Math.max(mx, t.id), 0) + 1
      setMsgs(
        turns.map((t) => ({
          id: t.id,
          utterance: t.utterance,
          res: reconstructResponse(t),
          extractOn: t.payload != null && 'extracted_ptkb' in (t.payload as object),
        })),
      )
    } catch {
      if (gen === convGen.current) setMsgs([])
    }
  }

  function onSessionDeleted(id: number) {
    if (id === activeSessionId) {
      convGen.current++ // active conversation gone: invalidate in-flight commits
      setActiveSessionId(null)
      setMsgs([])
    }
  }

  async function send(utterance: string) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    const gen = convGen.current // pin this conversation; drop commits if it changes mid-flight
    const id = nextId.current++
    const history = msgs.flatMap((m) => (m.res ? [m.utterance, m.res.response] : []))
    setMsgs((m) => [...m, { id, utterance, extractOn: extractPtkb }])
    const update = (patch: Partial<Msg>) => {
      if (gen !== convGen.current) return
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    }
    try {
      const status = models ?? (await api.models().catch(() => null))
      if (status) setModels(status)
      if (!status) {
        update({ error: 'Could not reach the backend — is the server running?' })
        return
      }
      const retrievers = buildSearchLegs(status, encoderSels, legQueryTypes, searchOff)
      if (retrievers.length === 0) {
        update({ error: 'No active retriever. Open Models (top right) and activate a unit.' })
        return
      }

      // auto-create a session on the first message so the conversation is saved (ChatGPT-style)
      let sid = activeSessionId
      if (sid == null) {
        try {
          const s = await api.createSession(utterance.slice(0, 60))
          sid = s.id
          if (gen === convGen.current) {
            setActiveSessionId(sid)
            setReloadSignal((n) => n + 1)
          }
        } catch {
          /* persistence is best-effort; stay ephemeral on failure */
        }
      }

      const res = await api.search({
        utterance,
        history,
        retrievers,
        generation: 'rag',
        cite_passages: true,
        session_id: sid ?? undefined,
        extract_ptkb: extractPtkb,
      })
      update({ res })
      if (res.persisted && gen === convGen.current) {
        setReloadSignal((n) => n + 1)
        if (extractPtkb) setPtkbReload((n) => n + 1) // a turn may have learned new profile facts
      }
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
    convGen.current++
    api.logout().catch(() => undefined)
    setToken(null)
    setUser(null)
    setModels(null)
    setMsgs([])
    setActiveSessionId(null)
    setShowModels(false)
  }

  if (checking) return <div className="grid min-h-full place-items-center text-muted">…</div>
  if (!user) return <Login onLoggedIn={setUser} />

  return (
    <div className="flex h-screen">
      <SessionSidebar
        activeId={activeSessionId}
        onOpen={openSession}
        onDelete={onSessionDeleted}
        reloadSignal={reloadSignal}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <img
            src="/rali_pica_head.png"
            width={32}
            height={32}
            alt=""
            className="rounded-full bg-white object-cover ring-1 ring-line"
          />
          <span className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Magpie
          </span>
          <button
            onClick={() => setShowModels(true)}
            className="ml-3 rounded-lg border border-line bg-paper px-3 py-1 text-sm transition hover:bg-cream"
          >
            Corpora &amp; models{models && models.resident.length > 0 ? ` · ${models.resident.length}` : ''}
          </button>
          <button
            onClick={() => setShowPtkb((v) => !v)}
            className={`rounded-lg border px-3 py-1 text-sm transition ${
              showPtkb ? 'border-clay/50 bg-clay/5' : 'border-line bg-paper hover:bg-cream'
            }`}
          >
            Profile
          </button>
          {models && models.resident.length === 0 && (
            <span className="text-xs text-clay">← activate a model to search</span>
          )}
          <span className="ml-auto text-sm text-muted">{user.username}</span>
          <button
            onClick={signOut}
            title="sign out and pick another account on the login screen"
            className="rounded-lg border border-line bg-paper px-3 py-1 text-sm text-muted transition hover:bg-cream hover:text-ink"
          >
            Switch user
          </button>
          <button
            onClick={signOut}
            className="rounded-lg border border-line bg-paper px-3 py-1 text-sm text-muted transition hover:bg-cream hover:text-ink"
          >
            Sign out
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden">
          {/* Sticky background magpie: pinned to the TOP-LEFT (next to the sidebar), fills the left
              whitespace of the conversation, and stays put while the conversation scrolls. */}
          <div className="pointer-events-none absolute left-0 top-3 z-0 w-60 select-none">
            <img src="/pica.png" alt="" className="w-full" />
          </div>
          <div ref={scrollRef} className="absolute inset-0 z-10 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-5xl space-y-6">
              {msgs.map((m) => (
                <div key={m.id} id={`turn-${m.id}`} className="scroll-mt-4 space-y-3">
                  <UserBubble text={m.utterance} />
                  {m.res ? (
                    <AssistantTurn res={m.res} onViewDoc={setViewDocid} extractOn={m.extractOn} />
                  ) : m.error ? (
                    <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{m.error}</div>
                  ) : (
                    <div className="text-sm text-muted">searching…</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <TurnNavigator
            turns={msgs.map((m) => ({ id: m.id, utterance: m.utterance }))}
            scrollRef={scrollRef}
          />
        </div>

        <Composer onSend={send} busy={busy} />
      </div>

      {showPtkb && (
        <FloatingProfile
          title="User profile"
          initial={{ x: 288, y: 96 }}
          onClose={() => setShowPtkb(false)}
        >
          <PtkbPanel
            reloadSignal={ptkbReload}
            extractEnabled={extractPtkb}
            onToggleExtract={setExtractPtkb}
            showHeader={false}
          />
        </FloatingProfile>
      )}

      {showModels && (
        <ModelPanel
          onClose={() => setShowModels(false)}
          onActivated={(m) => {
            setModels(m)
            // prune stale toggles: a unit evicted (or corpus-swapped) must not silently keep its
            // search-off state on a later re-activation (codex review)
            setSearchOff((prev) =>
              Object.fromEntries(Object.entries(prev).filter(([u]) => m.resident.includes(u))),
            )
          }}
          queryTypes={legQueryTypes}
          onQueryType={(unit, qt) => setLegQueryTypes((m) => ({ ...m, [unit]: qt }))}
          searchOff={searchOff}
          onSearchOff={(unit, off) => setSearchOff((m) => ({ ...m, [unit]: off }))}
          encoderSels={encoderSels}
          onEncoderSels={(unit, update) => setEncoderSels((m) => ({ ...m, [unit]: update(m[unit]) }))}
        />
      )}

      {viewDocid && <PassageModal docid={viewDocid} onClose={() => setViewDocid(null)} />}
    </div>
  )
}
