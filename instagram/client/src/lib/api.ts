export const API = '/api'

/** Error thrown for non-2xx responses; `status` lets pages tell "private" (403) from "missing" (404). */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...init,
    // Merge last so callers passing auth headers keep the JSON content type.
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError((err as { message?: string }).message ?? res.statusText, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
