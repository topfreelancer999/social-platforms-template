import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = Boolean(token && user)
  return { token, user, isAuthenticated }
}

export function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
