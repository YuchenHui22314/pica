// Typed fetch client for the Magpie backend. Bearer token in localStorage; 401 -> drop token.
import type {
  ActivateResponse,
  ActivateStatus,
  ModelsStatus,
  PtkbItem,
  SearchRequest,
  SearchResponse,
  Session,
  Turn,
  User,
} from './types'

const TOKEN_KEY = 'magpie_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t: string | null): void {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  })
  if (res.status === 401) {
    setToken(null)
    throw new ApiError(401, 'unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, (body as { detail?: string }).detail ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  // auth
  login: (username: string, password: string) =>
    req<{ token: string; user: User }>('/auth/login', post({ username, password })),
  me: () => req<User>('/auth/me'),
  logout: () => req<{ ok: boolean }>('/auth/logout', post()),

  // models / residency
  models: () => req<ModelsStatus>('/models'),
  activate: (units: string[]) => req<ActivateResponse>('/activate', post({ units })),
  activateStatus: (taskId: string) => req<ActivateStatus>(`/activate/status/${taskId}`),

  // search
  search: (body: SearchRequest) => req<SearchResponse>('/search', post(body)),

  // sessions
  sessions: () => req<Session[]>('/sessions'),
  createSession: (title: string) => req<{ id: number; title: string }>('/sessions', post({ title })),
  renameSession: (id: number, title: string) =>
    req<{ ok: boolean }>(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteSession: (id: number) => req<{ ok: boolean }>(`/sessions/${id}`, { method: 'DELETE' }),
  sessionTurns: (id: number) => req<Turn[]>(`/sessions/${id}/turns`),

  // ptkb
  ptkb: () => req<PtkbItem[]>('/ptkb'),
  addPtkb: (statement: string) => req<{ id: number }>('/ptkb', post({ statement })),
  updatePtkb: (id: number, statement: string) =>
    req<{ ok: boolean }>(`/ptkb/${id}`, { method: 'PUT', body: JSON.stringify({ statement }) }),
  deletePtkb: (id: number) => req<{ ok: boolean }>(`/ptkb/${id}`, { method: 'DELETE' }),
}
