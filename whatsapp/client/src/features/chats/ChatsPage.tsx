import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  isGroup: boolean
  unread: number
  lastMessage?: { content: string; createdAt: string; senderId: string }
  updatedAt: string
}

export function ChatsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<ThreadItem[]>('/messages/threads', { headers: authHeaders(token!) }),
    enabled: !!token,
    refetchInterval: 10000,
  })

  return (
    <div className="flex flex-col h-full bg-wa-header">
      <header className="h-14 px-4 flex items-center justify-between bg-wa-header shrink-0">
        <h1 className="text-xl font-medium">WhatsApp</h1>
        <div className="flex gap-4 text-wa-muted">
          <Link to="/search"><Search size={20} /></Link>
          <Link to="/contacts/new"><Plus size={20} /></Link>
        </div>
      </header>
      <div className="px-3 pb-2">
        <input
          placeholder="Search or start new chat"
          className="w-full bg-wa-panel rounded-lg px-4 py-2 text-sm outline-none border border-wa-border"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
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
                  <span className="text-xs text-wa-muted shrink-0 ml-2">{rel(t.lastMessage.createdAt)}</span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-sm text-wa-muted truncate">
                  {t.lastMessage?.content ?? 'No messages yet'}
                </p>
                {t.unread > 0 && (
                  <span className="bg-wa-teal text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
                    {t.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {!data?.length && <p className="text-center text-wa-muted py-8 text-sm">No chats yet</p>}
      </div>
    </div>
  )
}
