import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
}

interface ToastState {
  toasts: Toast[]
  show: (message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

/** Small transient notices (e.g. a vote that could not be saved). */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message) => {
    const id = nextId++
    // Collapse repeats so rapid failed clicks don't stack identical toasts.
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.message !== message), { id, message }].slice(-3) }))
    setTimeout(() => get().dismiss(id), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
