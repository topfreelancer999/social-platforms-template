import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPublic } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  token: string | null
  user: UserPublic | null
  setAuth: (token: string, user: UserPublic) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('linkedin-auth-token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('linkedin-auth-token')
        set({ token: null, user: null })
      },
      refreshUser: async () => {
        const { token } = get()
        if (!token) return
        try {
          const user = await api<UserPublic>('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ user })
        } catch {
          get().logout()
        }
      },
    }),
    { name: 'linkedin-auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
)
