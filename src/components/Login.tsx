import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError, setToken } from '../lib/api'
import type { DirectoryUser, User } from '../lib/types'

export function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState<DirectoryUser[]>([])

  useEffect(() => {
    api.users().then(setUsers).catch(() => undefined) // demo account picker; best-effort
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { token, user } =
        mode === 'signin'
          ? await api.login(username, password)
          : await api.register(username, password)
      setToken(token)
      onLoggedIn(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Incorrect username or password')
      else if (err instanceof ApiError && err.status === 409) setError('Username already taken')
      else setError(mode === 'signin' ? 'Sign-in failed — please try again' : 'Could not create account — please try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-sm ring-1 ring-line"
      >
        <img src="/rali_pica.png" width={132} alt="Magpie" className="mx-auto" />
        <h1 className="mt-3 text-center text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
          Magpie
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted">
          A <span className="text-ink">Personalized Information-seeking Conversational Agent (PICA)</span>{' '}
          that brings back the web&rsquo;s brightest passages.
        </p>
        <p className="mt-1 text-center text-sm italic text-muted">it fetches what shines.</p>

        {/* mode toggle */}
        <div className="mt-5 flex justify-center gap-1 rounded-lg bg-cream p-1 text-sm">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError('')
              }}
              className={`flex-1 rounded-md px-3 py-1 transition ${
                mode === m ? 'bg-paper font-medium shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          autoFocus
          autoComplete="username"
          className="mt-4 w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:ring-2 focus:ring-clay/40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={mode === 'signup' ? 'choose a password' : 'password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="mt-3 w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:ring-2 focus:ring-clay/40"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-5 w-full rounded-lg bg-clay px-3 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account & sign in'}
        </button>

        {/* existing accounts (demo picker): click a name to fill it in */}
        {mode === 'signin' && users.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="mb-2 text-center text-xs uppercase tracking-wide text-muted">
              existing accounts
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {users.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => setUsername(u.username)}
                  className={`rounded-full px-3 py-1 text-xs ring-1 ring-line transition hover:bg-cream ${
                    username === u.username ? 'bg-cream font-medium' : 'bg-paper text-muted'
                  }`}
                >
                  {u.username}
                  {u.is_admin ? ' ★' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
