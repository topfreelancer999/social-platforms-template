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
    <div className="mx-auto flex max-w-2xl min-h-[70vh] flex-col rounded-xl bg-white/10">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link to="/chat" className="text-white/60"><ArrowLeft size={22} /></Link>
        <img src={data?.thread.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-9 h-9 rounded-full" />
        <p className="font-semibold">{data?.thread.title ?? 'Chat'}</p>
      </header>
      <div className="min-h-[400px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {data?.messages.map((m) => {
          const mine = m.senderId === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[var(--sc-blue)] text-white' : 'border border-white/20 bg-white/10'}`}>
                {!mine && <p className="mb-0.5 text-xs text-white/50">@{m.sender.username}</p>}
                {m.content}
                <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-white/40'}`}>{rel(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-white/10 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-[var(--sc-yellow)]"
        />
        <button type="submit" disabled={!text.trim()} className="p-2 text-[var(--sc-yellow)]">
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}
