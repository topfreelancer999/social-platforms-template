import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Paperclip } from 'lucide-react'
import { io } from 'socket.io-client'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

type Msg = {
  id: string
  content: string
  type: string
  mediaUrl?: string | null
  read: boolean
  delivered: boolean
  createdAt: string
  senderId: string
  sender: { username: string; firstName: string; avatarUrl: string }
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
      api<{
        thread: { id: string; title: string; avatarUrl?: string; isGroup: boolean }
        messages: Msg[]
      }>(`/messages/threads/${threadId}`, { headers: authHeaders(accessToken!) }),
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
      qc.invalidateQueries({ queryKey: ['threads'] })
    })
    return () => { socket.disconnect() }
  }, [accessToken, threadId, qc])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  const thread = data?.thread
  const messages = data?.messages ?? []

  return (
    <div className="flex flex-col h-screen bg-wa-chat">
      <header className="h-14 px-4 flex items-center gap-3 bg-wa-header shrink-0 border-b border-wa-border">
        <Link to="/" className="md:hidden text-wa-muted"><ArrowLeft size={22} /></Link>
        <img src={thread?.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-10 h-10 rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{thread?.title ?? 'Chat'}</p>
          <p className="text-xs text-wa-muted">{thread?.isGroup ? 'Group' : 'online'}</p>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h60v60H0z\' fill=\'%230b141a\'/%3E%3Cpath d=\'M30 0v60M0 30h60\' stroke=\'%23111b21\' stroke-width=\'.5\'/%3E%3C/svg%3E")' }}
      >
        {messages.map((m) => {
          const mine = m.senderId === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                  mine ? 'bg-wa-outgoing rounded-tr-none' : 'bg-wa-incoming rounded-tl-none'
                }`}
              >
                {thread?.isGroup && !mine && (
                  <p className="text-xs text-wa-teal font-medium mb-0.5">{m.sender.firstName}</p>
                )}
                {m.mediaUrl && m.type === 'IMAGE' && (
                  <img src={m.mediaUrl} alt="" className="rounded mb-1 max-w-full" />
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 text-right ${mine ? 'text-wa-muted' : 'text-wa-muted'}`}>
                  {rel(m.createdAt)}
                  {mine && (m.read ? ' ✓✓' : m.delivered ? ' ✓✓' : ' ✓')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="px-4 py-3 bg-wa-header flex items-center gap-2 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <button type="button" className="text-wa-muted p-2"><Paperclip size={22} /></button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-wa-panel rounded-lg px-4 py-2.5 text-sm outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="p-2 text-wa-teal disabled:opacity-40">
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}
