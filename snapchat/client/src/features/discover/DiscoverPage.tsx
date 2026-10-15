import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type Channel = {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  followerCount: number
  postCount: number
}

export function DiscoverPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api<{ channels: Channel[] }>('/channels', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div className="p-4">
      <h1 className="mb-2 text-2xl font-bold">Discover</h1>
      <p className="mb-4 text-sm text-white/60">Subscribe to post channels and browse Spotlight</p>

      {isLoading && <p className="text-white/60">Loading…</p>}

      <ul className="space-y-3">
        {(data?.channels ?? []).map((ch) => (
          <li key={ch.id}>
            <Link
              to={`/channels/${ch.slug}`}
              className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15"
            >
              <img src={ch.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{ch.name}</p>
                <p className="truncate text-sm text-white/60">{ch.description}</p>
                <p className="text-xs text-white/40">
                  {ch.followerCount} subscribers · {ch.postCount} posts
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
