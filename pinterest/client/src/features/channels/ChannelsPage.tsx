import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function ChannelsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api<{ channels: { slug: string; name: string; description: string; imageUrl: string; followerCount: number }[] }>('/channels', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Post channels</h1>
      <p className="mb-6 text-sm text-[var(--pin-gray)]">Subscribe to curated topic channels</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.channels ?? []).map((ch) => (
          <li key={ch.slug}>
            <Link to={`/channels/${ch.slug}`} className="flex gap-3 rounded-2xl border border-[var(--pin-border)] p-4 hover:shadow-md">
              <img src={ch.imageUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              <div>
                <p className="font-bold">{ch.name}</p>
                <p className="text-sm text-[var(--pin-gray)] line-clamp-2">{ch.description}</p>
                <p className="mt-1 text-xs text-[var(--pin-gray)]">{ch.followerCount} followers</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
