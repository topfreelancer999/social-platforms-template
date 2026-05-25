import { useAuthStore } from '@/stores/authStore'

export function bootstrapAuth() {
  const token = useAuthStore.getState().token
  if (token) {
    localStorage.setItem('linkedin-auth-token', token)
  }
}
