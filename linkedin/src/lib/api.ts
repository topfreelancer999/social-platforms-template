import { API_BASE } from './constants'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    // Merge last so callers passing auth headers keep the JSON content type.
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      (body as { message?: string }).message ?? res.statusText,
      res.status,
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
