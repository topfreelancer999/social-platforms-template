import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function ContactsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['contacts'],
    queryFn: () =>
      api<{ contacts: { id: string; username: string; displayName?: string; avatarUrl: string; isOnline: boolean }[] }>(
        '/contacts',
        { headers: authHeaders(token!) },
      ),
    enabled: !!token,
  })

  return (
    <ul>
      {(data?.contacts ?? []).map((c) => (
        <li key={c.id}>
          <Link to={`/profile/${c.username}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/60">
            <div className="relative">
              <img src={c.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              {c.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            <div>
              <p className="font-semibold">{c.displayName || c.username}</p>
              <p className="text-sm text-[var(--tg-muted)]">@{c.username}</p>
            </div>
          </Link>
        </li>
      ))}
      {!data?.contacts?.length && (
        <p className="p-6 text-center text-sm text-[var(--tg-muted)]">
          No contacts — <Link to="/search?tab=users" className="text-[var(--tg-blue)]">search users</Link>
        </p>
      )}
    </ul>
  )
}
