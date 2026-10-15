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
    <div className="bg-rd-card border border-rd-border rounded-lg overflow-hidden max-w-2xl">
      <header className="px-4 py-3 border-b border-rd-border flex justify-between items-center">
        <h1 className="text-lg font-bold">Messages</h1>
        <Link to="/search?tab=users" className="text-rd-blue text-sm font-semibold flex items-center gap-1">
          <Plus size={18} /> New
        </Link>
      </header>
      <div className="divide-y divide-rd-border">
        {data?.map((t) => (
          <Link key={t.id} to={`/messages/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-rd-bg">
            <img src={t.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="w-10 h-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{t.title}</p>
              <p className="text-xs text-rd-muted truncate">{t.lastMessage?.content ?? 'No messages'}</p>
            </div>
            {t.unread > 0 && (
              <span className="bg-rd-orange text-white text-xs rounded-full px-2 py-0.5">{t.unread}</span>
            )}
          </Link>
        ))}
        {!data?.length && <p className="text-center text-rd-muted py-8 text-sm">No messages yet</p>}
      </div>
    </div>
  )
}
