import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { ServerDetail } from './types'

export function useServer(serverId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['server', serverId],
    queryFn: () => api<{ server: ServerDetail }>(`/servers/${serverId}`, { headers: authHeaders(token) }),
    enabled: !!serverId && !!token,
    select: (d) => d.server,
  })
}

/**
 * One socket per open server: live channel messages plus roles/channels/members
 * broadcasts so permission changes made elsewhere show up without a reload.
 */
export function useServerRealtime(serverId: string | undefined, channelId?: string) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token || !serverId) return
    const socket = io('/', { auth: { token }, path: '/socket.io' })
    // The server re-checks VIEW_CHANNEL on every join, so rejoining after a change is safe.
    const joinChannel = () => {
      if (channelId) socket.emit('channel:join', channelId)
    }
    socket.on('connect', () => {
      socket.emit('server:join', serverId)
      joinChannel()
    })
    const onMessage = (m: { channelId: string }) => {
      qc.invalidateQueries({ queryKey: ['channel', m.channelId] })
    }
    const onServerChange = (e: { serverId: string }) => {
      if (e.serverId !== serverId) return
      qc.invalidateQueries({ queryKey: ['server', serverId] })
      qc.invalidateQueries({ queryKey: ['servers'] })
      qc.invalidateQueries({ queryKey: ['channel'] })
      qc.invalidateQueries({ queryKey: ['overwrites'] })
      joinChannel()
    }
    socket.on('channel:message', onMessage)
    socket.on('channel:message:delete', onMessage)
    socket.on('roles:update', onServerChange)
    socket.on('channels:update', onServerChange)
    socket.on('members:update', onServerChange)
    return () => {
      socket.disconnect()
    }
  }, [token, serverId, channelId, qc])
}
