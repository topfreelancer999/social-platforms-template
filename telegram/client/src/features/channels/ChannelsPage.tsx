import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function ChannelsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['channels'],
    queryFn: () =>
      api<{ channels: { slug: string; name: string; description: string; imageUrl: string; subscriberCount: number }[] }>(
        '/channels',
        { headers: authHeaders(token!) },
      ),
    enabled: !!token,
  })

  return (
    <ul>
      {(data?.channels ?? []).map((ch) => (
        <li key={ch.slug}>
          <Link to={`/channels/${ch.slug}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/60">
            <img src={ch.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ch.name}</p>
              <p className="truncate text-sm text-[var(--tg-muted)]">{ch.description}</p>
              <p className="text-xs text-[var(--tg-blue)]">{ch.subscriberCount} subscribers</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
