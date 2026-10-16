import { create } from 'zustand'

export type Typer = { userId: string; name: string }

interface TypingState {
  byThread: Record<string, Typer[]>
  setTyping: (threadId: string, typer: Typer, isTyping: boolean) => void
}

/** Senders refresh "typing" every few seconds; drop anyone we haven't heard from in this long. */
const EXPIRE_MS = 6000
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useTypingStore = create<TypingState>((set, get) => ({
  byThread: {},
  setTyping: (threadId, typer, isTyping) => {
    const key = `${threadId}:${typer.userId}`
    clearTimeout(timers.get(key))
    timers.delete(key)
    const current = get().byThread[threadId] ?? []
    const others = current.filter((t) => t.userId !== typer.userId)
    if (isTyping) {
      timers.set(key, setTimeout(() => get().setTyping(threadId, typer, false), EXPIRE_MS))
      set({ byThread: { ...get().byThread, [threadId]: [...others, typer] } })
    } else if (others.length !== current.length) {
      set({ byThread: { ...get().byThread, [threadId]: others } })
    }
  },
}))

const NONE: Typer[] = []

export function useTypers(threadId: string | undefined) {
  return useTypingStore((s) => (threadId ? s.byThread[threadId] : undefined) ?? NONE)
}

export function typingLabel(typers: Typer[], isGroup: boolean) {
  if (!typers.length) return null
  if (!isGroup) return 'typing…'
  if (typers.length === 1) return `${typers[0].name} is typing…`
  return `${typers.map((t) => t.name).join(', ')} are typing…`
}
