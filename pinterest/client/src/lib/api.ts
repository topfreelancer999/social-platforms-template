export const API = '/api'

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData bodies need the browser-generated multipart boundary, so they get no JSON default.
  const json = !(init?.body instanceof FormData)
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...init,
    // Merge last so callers passing auth headers keep the JSON content type.
    headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
