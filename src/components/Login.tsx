import { useState, type FormEvent } from 'react'
import { api, ApiError, setToken } from '../lib/api'
import type { User } from '../lib/types'

export function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { token, user } = await api.login(username, password)
      setToken(token)
      onLoggedIn(user)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401 ? '用户名或密码错误' : '登录失败，请重试',
      )
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
        <p className="mt-5 text-center text-xs uppercase tracking-wide text-muted">sign in</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          autoFocus
          autoComplete="username"
          className="mt-6 w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:ring-2 focus:ring-clay/40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          autoComplete="current-password"
          className="mt-3 w-full rounded-lg border border-line bg-cream px-3 py-2 outline-none focus:ring-2 focus:ring-clay/40"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-5 w-full rounded-lg bg-clay px-3 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
