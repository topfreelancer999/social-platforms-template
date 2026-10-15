import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { rel } from '@/lib/format'

export function MessagingPage() {
  const { threadId } = useParams()
  const { accessToken, user } = useAuthStore()
  const [msg, setMsg] = useState('')
  const qc = useQueryClient()
  const { data: threads } = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<{ id: string; participant: { firstName: string; lastName: string; avatarUrl: string }; unread: number; lastMessage?: { content: string } }[]>('/messages/threads', { headers: authHeaders(accessToken) }),
  })
  const { data: thread } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<{ participant: { firstName: string }; messages: { id: string; content: string; senderId: string; createdAt: string; sender: { firstName: string } }[] }>(`/messages/threads/${threadId}`, { headers: authHeaders(accessToken) }),
    enabled: !!threadId,
  })
  const send = useMutation({
    mutationFn: () => api(`/messages/threads/${threadId}`, { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ content: msg }) }),
    onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['thread', threadId] }) },
  })
  useEffect(() => {
    if (!accessToken) return
    const socket = io('/', { auth: { token: accessToken }, path: '/socket.io' })
    socket.on('message:new', () => qc.invalidateQueries({ queryKey: ['threads'] }))
    if (threadId) socket.emit('thread:join', threadId)
    return () => { socket.disconnect() }
  }, [accessToken, threadId, qc])
  return (
    <div className="flex h-[calc(100vh-120px)] bg-fb-card rounded-lg shadow overflow-hidden">
      <div className="w-full md:w-80 border-r overflow-y-auto">
        <p className="p-3 font-bold text-xl">Chats</p>
        {threads?.map((t) => (
          <Link key={t.id} to={`/messages/${t.id}`} className={`flex gap-2 p-3 hover:bg-[#f0f2f5] ${threadId === t.id ? 'bg-[#e7f3ff]' : ''}`}>
            <Avatar src={t.participant.avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.participant.firstName} {t.participant.lastName}</p>
              <p className="text-xs text-fb-muted truncate">{t.lastMessage?.content}</p>
            </div>
            {t.unread > 0 && <span className="bg-fb-primary text-white text-xs rounded-full px-2">{t.unread}</span>}
          </Link>
        ))}
      </div>
      <div className="hidden md:flex flex-1 flex-col">
        {threadId && thread ? (
          <>
            <p className="p-3 font-semibold border-b">{thread.participant.firstName}</p>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {thread.messages.map((m) => (
                <div key={m.id} className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.senderId === user?.id ? 'ml-auto bg-fb-primary text-white' : 'bg-[#e4e6eb]'}`}>
                  {m.content}
                  <p className="text-[10px] opacity-70 mt-1">{rel(m.createdAt)}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} className="flex-1 rounded-full bg-[#f0f2f5] px-4 py-2 text-sm" onKeyDown={(e) => e.key === 'Enter' && msg && send.mutate()} />
              <button onClick={() => send.mutate()} className="text-fb-primary font-semibold">Send</button>
            </div>
          </>
        ) : (
          <p className="m-auto text-fb-muted">Select a chat</p>
        )}
      </div>
    </div>
  )
}
