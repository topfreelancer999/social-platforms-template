import { create } from 'zustand'

interface UIState {
  searchQuery: string
  setSearchQuery: (q: string) => void
  toast: string | null
  showToast: (msg: string) => void
  clearToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  toast: null,
  showToast: (msg) => {
    set({ toast: msg })
    setTimeout(() => set({ toast: null }), 3000)
  },
  clearToast: () => set({ toast: null }),
}))
