import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { typingLabel, useTypingStore } from '@/stores/typingStore'
import { chatListTime } from '@/lib/format'
import { MessageTicks } from './MessageTicks'
import type { ThreadItem } from './types'

function Preview({ thread, myId }: { thread: ThreadItem; myId?: string }) {
  const typers = useTypingStore((s) => s.byThread[thread.id])
  const typing = typingLabel(typers ?? [], thread.isGroup)
  if (typing) return <p className="text-sm text-wa-typing truncate">{typing}</p>

  const last = thread.lastMessage
  if (!last) return <p className="text-sm text-wa-muted truncate">No messages yet</p>
  const mine = last.senderId === myId
  return (
    <p className="flex items-center gap-1 text-sm text-wa-muted min-w-0">
      {mine && <MessageTicks status={last.status} />}
      <span className="truncate">
        {thread.isGroup && !mine && `${last.sender.firstName}: `}
        {last.content}
      </span>
    </p>
  )
}

export function ChatsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const myId = useAuthStore((s) => s.user?.id)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<ThreadItem[]>('/messages/threads', { headers: authHeaders(token) }),
    enabled: !!token,
  })

  return (
    <div className="flex flex-col h-full bg-wa-header">
      <header className="h-14 px-4 flex items-center justify-between bg-wa-header shrink-0">
        <h1 className="text-xl font-medium">WhatsApp</h1>
        <div className="flex gap-4 text-wa-muted">
          <Link to="/search" aria-label="Search"><Search size={20} /></Link>
          <Link to="/contacts/new" aria-label="New chat"><Plus size={20} /></Link>
        </div>
      </header>
      <div className="px-3 pb-2">
        <input
          placeholder="Search or start new chat"
          className="w-full bg-wa-panel rounded-lg px-4 py-2 text-sm outline-none border border-wa-border"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-center text-wa-muted py-8 text-sm">Loading chats…</p>}
        {isError && <p className="text-center text-red-400 py-8 text-sm">Couldn't load chats.</p>}
        {data?.map((t) => (
          <Link
            key={t.id}
            to={`/chat/${t.id}`}
            className="flex items-center gap-3 px-3 py-3 hover:bg-wa-border/50 border-b border-wa-border/30"
          >
            <img
              src={t.avatarUrl || 'https://i.pravatar.cc/96?u=group'}
              alt=""
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="font-medium truncate">{t.title}</p>
                {t.lastMessage && (
                  <span className={`text-xs shrink-0 ml-2 ${t.unread > 0 ? 'text-wa-teal' : 'text-wa-muted'}`}>
                    {chatListTime(t.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2">
                <Preview thread={t} myId={myId} />
                {t.unread > 0 && (
                  <span className="bg-wa-teal text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
                    {t.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {data && !data.length && <p className="text-center text-wa-muted py-8 text-sm">No chats yet</p>}
      </div>
    </div>
  )
}
