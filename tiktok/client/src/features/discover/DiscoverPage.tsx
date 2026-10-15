import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { BottomNav } from '@/components/layout/BottomNav'

export function DiscoverPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const { data: trending } = useQuery({
    queryKey: ['trending-tags'],
    queryFn: () => api<{ tag: string; count: number }[]>('/trending/hashtags'),
  })
  const { data } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(submitted)}`, { headers: authHeaders(token) }),
    enabled: submitted.length > 0,
  })
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20 px-4 pt-4">
      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q) }}
        className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6"
      >
        <Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users, videos, #tags" className="flex-1 bg-transparent outline-none text-sm" />
      </form>
      <h2 className="font-bold mb-3">Trending hashtags</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {trending?.map((h) => (
          <Link key={h.tag} to={`/hashtag/${h.tag}`} className="px-3 py-1.5 bg-white/10 rounded-full text-sm">
            #{h.tag}
          </Link>
        ))}
      </div>
      {Array.isArray(data?.users) && (data.users as { username: string; firstName: string }[]).length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-tt-muted mb-2">Users</h3>
          {(data.users as { username: string; firstName: string }[]).map((u) => (
            <Link key={u.username} to={`/@${u.username}`} className="block py-2">@{u.username} — {u.firstName}</Link>
          ))}
        </div>
      )}
      <BottomNav active="discover" />
    </div>
  )
}
