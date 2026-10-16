import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Info, Paperclip, Send } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/authStore'
import { typingLabel, useTypers } from '@/stores/typingStore'
import { clock, dayLabel, lastSeenLabel } from '@/lib/format'
import { MessageTicks } from './MessageTicks'
import { MessageInfoSheet } from './MessageInfoSheet'
import type { Msg, ThreadDetail } from './types'

/** Re-announce "typing" this often while keys are pressed; stop after this much idle time. */
const TYPING_REFRESH_MS = 3000
const TYPING_IDLE_MS = 4000

function useTypingEmitter(threadId: string | undefined) {
  const state = useRef({ active: false, lastSent: 0, idle: undefined as ReturnType<typeof setTimeout> | undefined })

  const stop = useCallback(() => {
    const s = state.current
    clearTimeout(s.idle)
    if (s.active && threadId) getSocket()?.emit('typing', { threadId, isTyping: false })
    s.active = false
  }, [threadId])

  const ping = useCallback(() => {
    if (!threadId) return
    const s = state.current
    const now = Date.now()
    if (!s.active || now - s.lastSent > TYPING_REFRESH_MS) {
      getSocket()?.emit('typing', { threadId, isTyping: true })
      s.active = true
      s.lastSent = now
    }
    clearTimeout(s.idle)
    s.idle = setTimeout(stop, TYPING_IDLE_MS)
  }, [threadId, stop])

  // Leaving the chat ends "typing…" for the other side.
  useEffect(() => stop, [stop])

  return { ping, stop }
}

export function ChatPage() {
  const { threadId } = useParams()
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [infoFor, setInfoFor] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typers = useTypers(threadId)
  const typing = useTypingEmitter(threadId)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<ThreadDetail>(`/messages/threads/${threadId}`, { headers: authHeaders(accessToken) }),
    enabled: !!threadId && !!accessToken,
  })

  // Opening the chat (or a message arriving while it's open and visible) reads it → sender sees blue ticks.
  const unread = data?.thread.unread ?? 0
  useEffect(() => {
    if (!threadId || !accessToken || unread === 0) return
    const markRead = () => {
      if (document.visibilityState !== 'visible') return
      api(`/messages/threads/${threadId}/read`, { method: 'POST', headers: authHeaders(accessToken) })
        .then(() => {
          qc.invalidateQueries({ queryKey: ['thread', threadId] })
          qc.invalidateQueries({ queryKey: ['threads'] })
        })
        .catch(() => {})
    }
    markRead()
    document.addEventListener('visibilitychange', markRead)
    return () => document.removeEventListener('visibilitychange', markRead)
  }, [threadId, accessToken, unread, qc])

  const send = useMutation({
    mutationFn: (content: string) =>
      api<Msg>(`/messages/threads/${threadId}`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ content }),
      }),
    // Show the bubble immediately with a clock until the server confirms it.
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: ['thread', threadId] })
      const previous = qc.getQueryData<ThreadDetail>(['thread', threadId])
      if (previous && user) {
        const pending: Msg = {
          id: `pending-${Date.now()}`,
          threadId: threadId!,
          content,
          type: 'TEXT',
          createdAt: new Date().toISOString(),
          senderId: user.id,
          sender: user,
          status: 'pending',
        }
        qc.setQueryData<ThreadDetail>(['thread', threadId], { ...previous, messages: [...previous.messages, pending] })
      }
      return { previous }
    },
    onError: (_err, content, ctx) => {
      if (ctx?.previous) qc.setQueryData(['thread', threadId], ctx.previous)
      setText(content)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  const thread = data?.thread
  const messages = data?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typers.length])

  const others = thread?.participants.filter((p) => p.id !== user?.id) ?? []
  const contact = !thread?.isGroup ? others[0] : undefined
  const subtitle =
    typingLabel(typers, !!thread?.isGroup) ??
    (thread?.isGroup
      ? [...others.map((p) => p.firstName), 'You'].join(', ')
      : contact?.online
        ? 'online'
        : contact?.lastSeen
          ? lastSeenLabel(contact.lastSeen)
          : '')
  const isTyping = typers.length > 0

  return (
    <div className="flex flex-col h-screen bg-wa-chat">
      <header className="h-14 px-4 flex items-center gap-3 bg-wa-header shrink-0 border-b border-wa-border">
        <Link to="/" className="md:hidden text-wa-muted" aria-label="Back to chats"><ArrowLeft size={22} /></Link>
        <img src={thread?.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{thread?.title ?? 'Chat'}</p>
          <p className={`text-xs truncate ${isTyping ? 'text-wa-typing' : 'text-wa-muted'}`}>{subtitle}</p>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1.5"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h60v60H0z\' fill=\'%230b141a\'/%3E%3Cpath d=\'M30 0v60M0 30h60\' stroke=\'%23111b21\' stroke-width=\'.5\'/%3E%3C/svg%3E")' }}
      >
        {isLoading && <p className="text-center text-sm text-wa-muted py-8">Loading messages…</p>}
        {isError && <p className="text-center text-sm text-red-400 py-8">Couldn't load this chat.</p>}
        {data && !messages.length && (
          <p className="mx-auto w-fit bg-wa-header text-wa-muted text-xs rounded-lg px-3 py-1.5">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === user?.id
          const newDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt)
          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="flex justify-center py-2">
                  <span className="bg-wa-header text-wa-muted text-xs rounded-lg px-3 py-1 shadow-sm">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <div className={`group flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                {mine && m.status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => setInfoFor(m.id)}
                    className="p-1 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-header sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    aria-label="Message info"
                    title="Message info"
                  >
                    <Info size={16} />
                  </button>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                    mine ? 'bg-wa-outgoing rounded-tr-none' : 'bg-wa-incoming rounded-tl-none'
                  }`}
                >
                  {thread?.isGroup && !mine && (
                    <p className="text-xs text-wa-teal font-medium mb-0.5">{m.sender.firstName}</p>
                  )}
                  {m.mediaUrl && m.type === 'IMAGE' && (
                    <img src={m.mediaUrl} alt="" className="rounded mb-1 max-w-full" />
                  )}
                  <p className="whitespace-pre-wrap break-words pr-14">{m.content}</p>
                  <p className="flex items-center justify-end gap-1 text-[11px] text-wa-muted -mt-3.5 leading-4">
                    {clock(m.createdAt)}
                    {mine && <MessageTicks status={m.status} />}
                  </p>
                </div>
              </div>
            </Fragment>
          )
        })}
        {isTyping && thread?.isGroup && (
          <div className="flex justify-start">
            <span className="bg-wa-incoming rounded-lg rounded-tl-none px-3 py-2 text-xs text-wa-typing">
              {typingLabel(typers, true)}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="px-3 sm:px-4 py-3 bg-wa-header flex items-center gap-2 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          const content = text.trim()
          if (!content) return
          typing.stop()
          setText('')
          send.mutate(content)
        }}
      >
        <button type="button" className="text-wa-muted p-2" aria-label="Attach"><Paperclip size={22} /></button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value.trim()) typing.ping()
            else typing.stop()
          }}
          onBlur={typing.stop}
          placeholder="Type a message"
          className="flex-1 min-w-0 bg-wa-panel rounded-lg px-4 py-2.5 text-sm outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="p-2 text-wa-teal disabled:opacity-40" aria-label="Send">
          <Send size={22} />
        </button>
      </form>
      {send.isError && (
        <p className="px-4 pb-2 bg-wa-header text-xs text-red-400">Message not sent. Check your connection and try again.</p>
      )}

      {infoFor && (
        <MessageInfoSheet messageId={infoFor} isGroup={!!thread?.isGroup} onClose={() => setInfoFor(null)} />
      )}
    </div>
  )
}
