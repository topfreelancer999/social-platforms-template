import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Paperclip, Ellipsis, Megaphone, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import type { PublicUser } from '@/features/contacts/api'
import { canManage, type ChatRole } from '@/features/group-chats/api'
import { GroupAvatar } from '@/features/group-chats/GroupAvatar'
import { MentionText } from '@/features/group-chats/MentionText'
import { useChatSocket } from '@/features/group-chats/useChatSocket'

type Msg = {
  id: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'SYSTEM' | 'NOTICE'
  mediaUrl?: string | null
  read: boolean
  delivered: boolean
  createdAt: string
  senderId: string
  sender: { username: string; firstName: string; displayName?: string; avatarUrl: string }
  mentionAll: boolean
  mentionIds: string[]
}

type Participant = PublicUser & { role: ChatRole; groupName: string }

type ThreadData = {
  thread: {
    id: string
    title: string
    avatarUrl?: string
    isGroup: boolean
    memberAvatars: string[]
    memberCount: number
    myRole: ChatRole
    announcement: { content: string; updatedAt: string | null } | null
    participants: Participant[]
  }
  messages: Msg[]
}

/** A member picked from the @ picker; `id` is "all" for @All. */
type Mention = { id: string; name: string }

export function ChatPage() {
  const { threadId } = useParams()
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  /** Caret position just after the typed "@" while the member picker is open. */
  const [pickerAt, setPickerAt] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<ThreadData>(`/messages/threads/${threadId}`, { headers: authHeaders(accessToken!) }),
    enabled: !!threadId && !!accessToken,
    refetchInterval: 5000,
    retry: false,
  })
  useChatSocket(threadId)

  const thread = data?.thread
  const messages = data?.messages ?? []
  const isGroup = !!thread?.isGroup
  const mayMentionAll = isGroup && canManage(thread?.myRole)
  const members = thread?.participants ?? []
  const nameOf = new Map(members.map((p) => [p.id, p.groupName]))
  const highlightNames = members.flatMap((p) => [p.groupName, p.displayName || p.firstName])

  const send = useMutation({
    mutationFn: () => {
      const content = text.trim()
      const live = mentions.filter((m) => content.includes(`@${m.name}`))
      return api(`/messages/threads/${threadId}`, {
        method: 'POST',
        headers: authHeaders(accessToken!),
        body: JSON.stringify({
          content,
          mentionIds: live.filter((m) => m.id !== 'all').map((m) => m.id),
          mentionAll: mayMentionAll && live.some((m) => m.id === 'all'),
        }),
      })
    },
    onSuccess: () => {
      setText('')
      setMentions([])
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  const onType = (value: string, caret: number | null) => {
    // Typing "@" in a group opens the member picker (WeChat's "Choose a member to mention").
    if (isGroup && caret && value.length === text.length + 1 && value[caret - 1] === '@') setPickerAt(caret)
    setText(value)
  }

  const pickMention = (m: Mention) => {
    const at = pickerAt ?? text.length
    const next = `${text.slice(0, at)}${m.name} ${text.slice(at)}`
    setText(next)
    setMentions((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    setPickerAt(null)
    inputRef.current?.focus()
  }

  if (isLoading) return <p className="p-6 text-sm text-wx-muted">Loading chat…</p>
  if (isError || !thread) {
    return (
      <div className="p-6 text-sm space-y-2">
        <p className="text-red-500">{error?.message ?? 'Chat not found'}</p>
        <Link to="/" className="text-wx-green">Back to chats</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-wx-header relative">
      <header className="h-14 px-3 flex items-center gap-3 bg-wx-header shrink-0 border-b border-wx-border">
        <Link to="/" className="text-wx-text" aria-label="Back"><ArrowLeft size={22} /></Link>
        {isGroup ? (
          <GroupAvatar avatars={thread.memberAvatars} className="w-10 h-10" />
        ) : (
          <img src={thread.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-10 h-10 rounded-md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {thread.title}
            {isGroup && <span className="text-wx-muted font-normal"> ({thread.memberCount})</span>}
          </p>
          <p className="text-xs text-wx-muted">{isGroup ? 'Group chat' : 'online'}</p>
        </div>
        {isGroup && (
          <Link to={`/group-chat/${thread.id}/info`} className="p-2 text-wx-text" aria-label="Chat info">
            <Ellipsis size={22} />
          </Link>
        )}
      </header>

      {thread.announcement && (
        <Link
          to={`/group-chat/${thread.id}/notice`}
          className="flex items-center gap-2 px-4 py-2 bg-[#fff8e6] border-b border-[#f3e2b3] text-sm shrink-0"
        >
          <Megaphone size={16} className="text-[#fa9d3b] shrink-0" />
          <span className="truncate flex-1">{thread.announcement.content}</span>
        </Link>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-xs text-wx-muted">No messages yet. Say hi 👋</p>}
        {messages.map((m) => {
          if (m.type === 'SYSTEM') {
            return (
              <p key={m.id} className="text-center">
                <span className="inline-block text-xs text-wx-muted bg-black/5 rounded px-2 py-1">{m.content}</span>
              </p>
            )
          }
          const mine = m.senderId === user?.id
          const senderName = nameOf.get(m.senderId) ?? (m.sender.displayName || m.sender.firstName)
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {isGroup && <img src={m.sender.avatarUrl} alt="" className="w-9 h-9 rounded-md shrink-0" />}
              <div className={`max-w-[75%] min-w-0 flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {isGroup && !mine && <p className="text-xs text-wx-muted mb-0.5">{senderName}</p>}
                {m.type === 'NOTICE' ? (
                  <Link
                    to={`/group-chat/${thread.id}/notice`}
                    className="block bg-wx-incoming rounded-lg px-3 py-2 text-sm shadow-sm w-64 max-w-full"
                  >
                    <span className="flex items-center gap-1.5 text-[#fa9d3b] font-medium mb-1">
                      <Megaphone size={15} /> Group Notice
                    </span>
                    <span className="block text-[#576b95] font-medium">@All</span>
                    <span className="block whitespace-pre-wrap break-words">{m.content}</span>
                  </Link>
                ) : (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm shadow-sm ${
                      mine ? 'bg-wx-outgoing' : 'bg-wx-incoming'
                    } ${m.mentionIds.includes(user?.id ?? '') || (!mine && m.mentionAll) ? 'ring-1 ring-[#576b95]/30' : ''}`}
                  >
                    {m.mediaUrl && m.type === 'IMAGE' && (
                      <img src={m.mediaUrl} alt="" className="rounded mb-1 max-w-full" />
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {isGroup ? <MentionText content={m.content} names={highlightNames} all={m.mentionAll} /> : m.content}
                    </p>
                  </div>
                )}
                <p className="text-[10px] mt-0.5 text-wx-muted">
                  {rel(m.createdAt)}
                  {mine && !isGroup && (m.read ? ' ✓✓' : m.delivered ? ' ✓✓' : ' ✓')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {pickerAt !== null && (
        <MentionPicker
          members={members.filter((p) => p.id !== user?.id)}
          allowAll={mayMentionAll}
          onPick={pickMention}
          onClose={() => {
            setPickerAt(null)
            inputRef.current?.focus()
          }}
        />
      )}

      <form
        className="px-3 py-3 bg-wx-header border-t border-wx-border flex items-center gap-2 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate()
        }}
      >
        <button type="button" className="text-wx-muted p-1.5" aria-label="Attach"><Paperclip size={22} /></button>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => onType(e.target.value, e.target.selectionStart)}
          placeholder={isGroup ? 'Message (type @ to mention)' : 'Type a message'}
          className="flex-1 min-w-0 bg-wx-panel rounded-md px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="px-3 py-2 rounded-md bg-wx-green text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
      {send.isError && <p className="px-4 pb-2 text-xs text-red-500 bg-wx-header">{send.error.message}</p>}
    </div>
  )
}

/** Bottom sheet listing members to @mention; "@All" only for the owner/admins. */
function MentionPicker({
  members,
  allowAll,
  onPick,
  onClose,
}: {
  members: Participant[]
  allowAll: boolean
  onPick: (m: Mention) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = members.filter(
    (p) => !q || p.groupName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q),
  )
  return (
    <div className="absolute inset-x-0 bottom-0 top-14 z-20 flex flex-col bg-black/30" onClick={onClose}>
      <div
        className="mt-auto bg-wx-panel rounded-t-xl max-h-[70%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Choose a member to mention"
      >
        <div className="h-11 flex items-center justify-center relative border-b border-wx-border shrink-0">
          <button type="button" onClick={onClose} className="absolute left-3 text-wx-muted" aria-label="Close">
            <X size={20} />
          </button>
          <p className="font-medium text-sm">Choose a member to mention</p>
        </div>
        <div className="px-3 py-2 shrink-0">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-wx-bg rounded px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <div className="overflow-y-auto">
          {allowAll && !q && (
            <button
              type="button"
              onClick={() => onPick({ id: 'all', name: 'All' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-wx-border text-left hover:bg-wx-bg"
            >
              <span className="w-9 h-9 rounded-md bg-wx-green text-white flex items-center justify-center font-semibold">@</span>
              <span className="text-sm">All ({members.length + 1})</span>
            </button>
          )}
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick({ id: p.id, name: p.groupName })}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-wx-border text-left hover:bg-wx-bg"
            >
              <img src={p.avatarUrl} alt="" className="w-9 h-9 rounded-md" />
              <span className="text-sm flex-1 truncate">{p.groupName}</span>
              {p.role !== 'MEMBER' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-wx-bg text-wx-muted">
                  {p.role === 'OWNER' ? 'Owner' : 'Admin'}
                </span>
              )}
            </button>
          ))}
          {shown.length === 0 && <p className="px-4 py-4 text-sm text-wx-muted text-center">No members found</p>}
        </div>
      </div>
    </div>
  )
}
