import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

/** Server-computed streak (see server/src/lib/streaks.ts for the rules). */
export type Streak = {
  count: number
  startedAt: string
  expiresAt: string
  /** count >= 3: show 🔥 + count. */
  visible: boolean
  /** Today's exchange is missing and <= 4h remain. */
  hourglass: boolean
  milestone: string | null
}

export type SnapKind = 'PHOTO' | 'TEXT'
export type SnapStatus = 'NEW_SNAP' | 'RECEIVED' | 'DELIVERED' | 'OPENED'

export type ChatRow = {
  friend: { id: string; username: string; displayName: string; avatarUrl: string }
  threadId: string | null
  unread: number
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null
  snap: { id: string; status: SnapStatus; kind: SnapKind; at: string; count: number } | null
  streak: Streak | null
  updatedAt: string
}

export type OpenedSnap = {
  id: string
  kind: SnapKind
  imageUrl: string | null
  text: string
  color: string | null
  createdAt: string
  sender: { username: string; displayName?: string; avatarUrl: string }
}

/** Keeps chat list, friends and friendship profiles fresh when snaps/streaks change. */
export function useSnapRealtime() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  useEffect(() => {
    if (!token) return
    const socket = io('/', { auth: { token }, path: '/socket.io' })
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    }
    socket.on('snap:new', refresh)
    socket.on('snap:opened', refresh)
    socket.on('streak:updated', refresh)
    return () => {
      socket.disconnect()
    }
  }, [token, qc])
}
