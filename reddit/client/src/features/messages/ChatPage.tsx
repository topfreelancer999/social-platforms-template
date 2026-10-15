import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { io } from 'socket.io-client'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

type Msg = {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: { username: string; firstName: string }
}

export function ChatPage() {
  const { threadId } = useParams()
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () =>
      api<{ thread: { title: string; avatarUrl?: string }; messages: Msg[] }>(
        `/messages/threads/${threadId}`,
        { headers: authHeaders(accessToken!) },
      ),
    enabled: !!threadId && !!accessToken,
    refetchInterval: 5000,
  })

  const send = useMutation({
    mutationFn: () =>
      api(`/messages/threads/${threadId}`, {
        method: 'POST',
        headers: authHeaders(accessToken!),
        body: JSON.stringify({ content: text.trim() }),
      }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  useEffect(() => {
    if (!accessToken || !threadId) return
    const socket = io('/', { auth: { token: accessToken }, path: '/socket.io' })
    socket.emit('thread:join', threadId)
    socket.on('message:new', () => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
    })
    return () => { socket.disconnect() }
  }, [accessToken, threadId, qc])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  return (
    <div className="max-w-2xl mx-auto bg-rd-card border border-rd-border rounded-lg flex flex-col min-h-[70vh]">
      <header className="px-4 py-3 border-b border-rd-border flex items-center gap-3">
        <Link to="/messages" className="text-rd-muted"><ArrowLeft size={22} /></Link>
        <img src={data?.thread.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-9 h-9 rounded-full" />
        <p className="font-semibold">{data?.thread.title ?? 'Chat'}</p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-rd-bg min-h-[400px]">
        {data?.messages.map((m) => {
          const mine = m.senderId === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-rd-blue text-white' : 'bg-rd-card border border-rd-border'}`}>
                {!mine && <p className="text-xs text-rd-muted mb-0.5">u/{m.sender.username}</p>}
                {m.content}
                <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-rd-muted'}`}>{rel(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="px-4 py-3 border-t border-rd-border flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="flex-1 border border-rd-border rounded-full px-4 py-2 text-sm outline-none focus:border-rd-blue"
        />
        <button type="submit" disabled={!text.trim()} className="text-rd-blue p-2">
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}
