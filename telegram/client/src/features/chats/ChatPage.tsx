import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Copy,
  Forward,
  Loader2,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { dayLabel } from '@/lib/format'
import { MessageBubble } from './MessageBubble'
import { MessageMenu, type MenuItem } from './MessageMenu'
import { ForwardDialog } from './ForwardDialog'
import { DeleteDialog } from './DeleteDialog'
import { canEdit, senderName, snippet, type Msg, type ThreadDetail } from './types'

type Composer = { mode: 'reply' | 'edit'; msg: Msg } | null
type MenuState = { msg: Msg; x: number; y: number; editable: boolean } | null
type MenuAction = 'reply' | 'edit' | 'copy' | 'forward' | 'select' | 'delete'

export function ChatPage() {
  const { threadId } = useParams()
  // Keyed so reply/edit/selection state never leaks from one chat into the next.
  return threadId ? <ChatView key={threadId} threadId={threadId} /> : null
}

function ChatView({ threadId }: { threadId: string }) {
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [composer, setComposer] = useState<Composer>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [forwardIds, setForwardIds] = useState<string[] | null>(null)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, dataUpdatedAt, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<ThreadDetail>(`/messages/threads/${threadId}`, { headers: authHeaders(accessToken) }),
    enabled: !!accessToken,
  })
  const messages = data?.messages
  const lastId = messages?.at(-1)?.id

  const send = useMutation({
    mutationFn: ({ content, target }: { content: string; target: Composer }) =>
      target?.mode === 'edit'
        ? api<Msg>(`/messages/${target.msg.id}`, {
            method: 'PATCH',
            headers: authHeaders(accessToken),
            body: JSON.stringify({ content }),
          })
        : api<Msg>(`/messages/threads/${threadId}`, {
            method: 'POST',
            headers: authHeaders(accessToken),
            body: JSON.stringify({ content, replyToId: target?.msg.id }),
          }),
    onSuccess: () => {
      setText('')
      setComposer(null)
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  // Loading the chat marks it read on the server, so refresh the list's unread badge.
  useEffect(() => {
    if (dataUpdatedAt) qc.invalidateQueries({ queryKey: ['threads'] })
  }, [dataUpdatedAt, qc])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastId])

  // Esc leaves multi-select mode.
  useEffect(() => {
    if (!selecting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setSelecting(false)
        setSelected([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecting])

  // Toast-style notice and reply-jump highlight both fade out on their own.
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 2500)
    return () => window.clearTimeout(t)
  }, [notice])

  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(null), 1600)
    return () => window.clearTimeout(t)
  }, [highlightId])

  const flash = (message: string) => setNotice(message)

  const focusComposer = () => requestAnimationFrame(() => inputRef.current?.focus())

  const startReply = (msg: Msg) => {
    send.reset()
    setComposer({ mode: 'reply', msg })
    focusComposer()
  }

  const startEdit = (msg: Msg) => {
    send.reset()
    setComposer({ mode: 'edit', msg })
    setText(msg.content)
    focusComposer()
  }

  const cancelComposer = () => {
    if (composer?.mode === 'edit') setText('')
    setComposer(null)
    send.reset()
  }

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (!el) {
      flash('The original message is no longer available')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(id)
  }

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const exitSelection = () => {
    setSelecting(false)
    setSelected([])
  }

  const openMenu = (msg: Msg, x: number, y: number) =>
    setMenu({ msg, x, y, editable: canEdit(msg, user?.id) })

  const menuItems = (state: NonNullable<MenuState>) => {
    const items: MenuItem<MenuAction>[] = [{ key: 'reply', label: 'Reply', icon: Reply }]
    if (state.editable) items.push({ key: 'edit', label: 'Edit', icon: Pencil })
    if (state.msg.content) items.push({ key: 'copy', label: 'Copy text', icon: Copy })
    items.push(
      { key: 'forward', label: 'Forward', icon: Forward },
      { key: 'select', label: 'Select', icon: CheckSquare },
      { key: 'delete', label: 'Delete', icon: Trash2, danger: true },
    )
    return items
  }

  const runMenuAction = (msg: Msg, action: MenuAction) => {
    if (action === 'reply') startReply(msg)
    else if (action === 'edit') startEdit(msg)
    else if (action === 'copy') {
      navigator.clipboard
        .writeText(msg.content)
        .then(() => flash('Text copied to clipboard'))
        .catch(() => flash('Could not copy text'))
    } else if (action === 'forward') setForwardIds([msg.id])
    else if (action === 'select') {
      setSelecting(true)
      setSelected([msg.id])
    } else setDeleteIds([msg.id])
  }

  const submit = () => {
    const content = text.trim()
    if (!content || send.isPending) return
    if (composer?.mode === 'edit' && content === composer.msg.content) {
      cancelComposer()
      return
    }
    send.mutate({ content, target: composer })
  }

  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape' && composer) {
      e.preventDefault()
      cancelComposer()
    } else if (e.key === 'ArrowUp' && !text && !composer && messages) {
      // Like Telegram: ↑ in an empty composer edits your last message.
      const last = [...messages].reverse().find((m) => m.senderId === user?.id)
      if (last && canEdit(last, user?.id)) {
        e.preventDefault()
        startEdit(last)
      }
    }
  }

  const byId = new Map(messages?.map((m) => [m.id, m]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((m): m is Msg => !!m)

  return (
    <div className="flex h-full min-w-0 flex-col">
      {selecting ? (
        <header className="flex items-center gap-2 bg-[var(--tg-blue)] px-3 py-2.5 text-white">
          <button type="button" onClick={exitSelection} aria-label="Cancel selection" className="rounded-full p-1 hover:bg-white/10">
            <X size={22} />
          </button>
          <p className="flex-1 font-semibold" aria-live="polite">
            {selected.length} selected
          </p>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => setForwardIds(selected)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <Forward size={18} /> <span className="hidden sm:inline">Forward</span>
            <span className="sr-only sm:hidden">Forward</span>
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => setDeleteIds(selected)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <Trash2 size={18} /> <span className="hidden sm:inline">Delete</span>
            <span className="sr-only sm:hidden">Delete</span>
          </button>
        </header>
      ) : (
        <header className="flex items-center gap-3 bg-[var(--tg-blue)] px-3 py-2.5 text-white">
          <Link to="/" className="md:hidden" aria-label="Back to chats">
            <ArrowLeft size={22} />
          </Link>
          <img src={data?.thread.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="h-10 w-10 rounded-full object-cover" />
          <p className="min-w-0 truncate font-semibold">{data?.thread.title ?? 'Chat'}</p>
        </header>
      )}

      <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {isLoading && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--tg-muted)]">
            <Loader2 size={18} className="animate-spin" /> Loading messages…
          </p>
        )}
        {isError && (
          <div className="mx-auto mt-10 max-w-xs rounded-xl bg-white p-4 text-center text-sm shadow-sm">
            <p className="text-red-600">{error.message}</p>
            <button type="button" onClick={() => refetch()} className="mt-2 font-semibold text-[var(--tg-blue)]">
              Try again
            </button>
          </div>
        )}
        {messages && !messages.length && (
          <div className="mx-auto mt-10 max-w-xs rounded-xl bg-black/10 px-4 py-3 text-center text-sm text-white">
            No messages here yet…
          </div>
        )}
        {data &&
          messages?.map((m, i) => {
            const day = new Date(m.createdAt).toDateString()
            const newDay = i === 0 || new Date(messages[i - 1].createdAt).toDateString() !== day
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <p className="sticky top-0 z-[1] mx-auto my-2 w-fit rounded-full bg-black/20 px-3 py-0.5 text-xs font-medium text-white">
                    {dayLabel(new Date(m.createdAt))}
                  </p>
                )}
                <MessageBubble
                  msg={m}
                  mine={m.senderId === user?.id}
                  showSender={data.thread.isGroup}
                  selecting={selecting}
                  selected={selected.includes(m.id)}
                  highlighted={highlightId === m.id}
                  onOpenMenu={openMenu}
                  onToggleSelect={toggleSelect}
                  onJumpTo={jumpTo}
                />
              </Fragment>
            )
          })}
        <div ref={bottomRef} />
      </div>

      {notice && (
        <p role="status" className="relative z-10 mx-auto -mt-10 mb-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">
          {notice}
        </p>
      )}

      {!selecting && (
        <div className="border-t border-black/5 bg-white">
          {composer && (
            <div className="flex items-center gap-3 px-3 pt-2">
              {composer.mode === 'reply' ? (
                <Reply size={20} className="shrink-0 text-[var(--tg-blue)]" />
              ) : (
                <Pencil size={20} className="shrink-0 text-[var(--tg-blue)]" />
              )}
              <button
                type="button"
                onClick={() => jumpTo(composer.msg.id)}
                className="min-w-0 flex-1 border-l-2 border-[var(--tg-blue)] pl-2 text-left"
              >
                <span className="block truncate text-xs font-semibold text-[var(--tg-blue)]">
                  {composer.mode === 'reply' ? `Reply to ${senderName(composer.msg.sender)}` : 'Edit message'}
                </span>
                <span className="block truncate text-xs text-[var(--tg-muted)]">{snippet(composer.msg)}</span>
              </button>
              <button
                type="button"
                onClick={cancelComposer}
                aria-label={composer.mode === 'reply' ? 'Cancel reply' : 'Cancel editing'}
                className="rounded-full p-1 text-[var(--tg-muted)] hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {send.isError && (
            <p role="alert" className="px-4 pt-2 text-xs text-red-600">
              {send.error.message}
            </p>
          )}
          <form
            className="flex items-end gap-2 px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder="Message"
              aria-label="Message"
              maxLength={4096}
              className="field-sizing-content max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-black/10 bg-[var(--tg-sidebar)] px-4 py-2 text-sm outline-none focus:border-[var(--tg-blue)]"
            />
            <button
              type="submit"
              disabled={!text.trim() || send.isPending}
              aria-label={composer?.mode === 'edit' ? 'Save edit' : 'Send message'}
              className="rounded-full bg-[var(--tg-blue)] p-2 text-white disabled:opacity-60"
            >
              {composer?.mode === 'edit' ? <Check size={20} /> : <Send size={20} />}
            </button>
          </form>
        </div>
      )}

      {menu && (
        <MessageMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu)}
          onSelect={(action) => runMenuAction(menu.msg, action)}
          onClose={() => setMenu(null)}
        />
      )}

      {forwardIds && (
        <ForwardDialog
          messageIds={forwardIds}
          onClose={() => setForwardIds(null)}
          onForwarded={(threadIds) => {
            setForwardIds(null)
            exitSelection()
            // Like Telegram: forwarding to a single chat opens it.
            if (threadIds.length === 1 && threadIds[0] !== threadId) navigate(`/chat/${threadIds[0]}`)
            else flash(threadIds.length > 1 ? `Forwarded to ${threadIds.length} chats` : 'Message forwarded')
          }}
        />
      )}

      {deleteIds && data && (
        <DeleteDialog
          messages={pick(deleteIds)}
          thread={data.thread}
          onClose={() => setDeleteIds(null)}
          onDeleted={() => {
            if (composer && deleteIds.includes(composer.msg.id)) cancelComposer()
            setDeleteIds(null)
            exitSelection()
          }}
        />
      )}
    </div>
  )
}
