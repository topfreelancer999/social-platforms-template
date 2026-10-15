import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  unread: number
  lastMessage?: { content: string; createdAt: string }
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
    <div className="overflow-hidden rounded-xl bg-white/10">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-bold">Chat</h1>
        <Link to="/search?tab=users" className="flex items-center gap-1 text-sm font-semibold text-[var(--sc-yellow)]">
          <Plus size={18} /> New
        </Link>
      </header>
      <div className="divide-y divide-white/10">
        {data?.map((t) => (
          <Link key={t.id} to={`/chat/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
            <img src={t.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-10 h-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{t.title}</p>
              <p className="truncate text-xs text-white/50">{t.lastMessage?.content ?? 'No messages'}</p>
            </div>
            {t.unread > 0 && (
              <span className="rounded-full bg-[var(--sc-yellow)] px-2 py-0.5 text-xs text-black">{t.unread}</span>
            )}
          </Link>
        ))}
        {!data?.length && <p className="py-8 text-center text-sm text-white/50">No chats yet</p>}
      </div>
    </div>
  )
}
