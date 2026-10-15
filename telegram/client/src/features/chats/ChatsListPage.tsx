import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  unread: number
  isGroup?: boolean
  lastMessage?: { content: string; createdAt: string }
}

export function ChatsListPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<ThreadItem[]>('/messages/threads', { headers: authHeaders(token!) }),
    enabled: !!token,
    refetchInterval: 8000,
  })

  return (
    <ul>
      {data?.map((t) => (
        <li key={t.id}>
          <Link
            to={`/chat/${t.id}`}
            className="flex items-center gap-3 px-3 py-3 hover:bg-white/60"
          >
            <img
              src={t.avatarUrl || 'https://i.pravatar.cc/96'}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <p className="truncate font-semibold">{t.title}</p>
                {t.lastMessage && (
                  <span className="shrink-0 text-xs text-[var(--tg-muted)]">{rel(t.lastMessage.createdAt)}</span>
                )}
              </div>
              <p className="truncate text-sm text-[var(--tg-muted)]">
                {t.isGroup && '👥 '}
                {t.lastMessage?.content ?? 'No messages'}
              </p>
            </div>
            {t.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tg-blue)] px-1.5 text-xs text-white">
                {t.unread}
              </span>
            )}
          </Link>
        </li>
      ))}
      {!data?.length && <p className="p-6 text-center text-sm text-[var(--tg-muted)]">No chats yet</p>}
    </ul>
  )
}
