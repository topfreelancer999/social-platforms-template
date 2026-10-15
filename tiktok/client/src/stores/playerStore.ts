import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlayerState {
  /** Feed videos start muted (browsers only allow muted autoplay); the choice is remembered. */
  muted: boolean
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      muted: true,
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: 'tt-player' },
  ),
)
