import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { activityQueryKey, followRequestsQueryKey } from './activity'

/** Realtime badge updates: new notifications, follow request changes and accepted requests. */
export function useActivitySocket(token: string | null) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!token) return
    const socket = io('/', { auth: { token }, path: '/socket.io' })
    const refreshActivity = () => {
      qc.invalidateQueries({ queryKey: activityQueryKey })
      qc.invalidateQueries({ queryKey: followRequestsQueryKey })
    }
    socket.on('notification:new', refreshActivity)
    socket.on('follow-request:updated', refreshActivity)
    // Someone approved us: their profile, posts and stories are now visible.
    socket.on('follow-request:accepted', () => {
      refreshActivity()
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
    })
    return () => {
      socket.disconnect()
    }
  }, [token, qc])
}
