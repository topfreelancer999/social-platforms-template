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
    if (!accessToken) return
    const socket = io({ path: '/socket.io', auth: { token: accessToken } })
    socket.on('message', () => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    })
    return () => {
      socket.disconnect()
    }
  }, [accessToken, threadId, qc])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 bg-[var(--tg-blue)] px-3 py-2.5 text-white">
        <Link to="/" className="md:hidden">
          <ArrowLeft size={22} />
        </Link>
        <img src={data?.thread.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="h-10 w-10 rounded-full" />
        <p className="font-semibold">{data?.thread.title ?? 'Chat'}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {data?.messages.map((m) => {
          const mine = m.senderId === user?.id
          return (
            <div key={m.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine ? 'rounded-br-md bg-[var(--tg-bubble-out)]' : 'rounded-bl-md bg-[var(--tg-bubble-in)]'
                }`}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold text-[var(--tg-blue)]">@{m.sender.username}</p>}
                {m.content}
                <p className="mt-1 text-right text-[10px] text-[var(--tg-muted)]">{rel(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-black/5 bg-white px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded-full border border-black/10 bg-[var(--tg-sidebar)] px-4 py-2 text-sm outline-none focus:border-[var(--tg-blue)]"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-full bg-[var(--tg-blue)] p-2 text-white">
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}
