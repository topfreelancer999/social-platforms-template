import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'videos'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: authHeaders(token!) }),
    enabled: q.length > 0 && !!token,
  })
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
        }}
        className="flex gap-2 mb-4 max-w-2xl"
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-yt-surface rounded-full px-4 py-2 text-sm" placeholder="Search" />
        <button type="submit" className="bg-yt-hover px-6 rounded-full text-sm">Search</button>
      </form>
      <div className="flex gap-2 mb-6">
        {['videos', 'channels', 'groups', 'posts'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${tab === t ? 'bg-white text-black' : 'bg-yt-surface'}`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'videos' && Array.isArray(data?.videos) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.videos as VideoCardData[]).map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
      {tab === 'channels' && Array.isArray(data?.channels) &&
        (data.channels as { username: string; channelName: string }[]).map((c) => (
          <Link key={c.username} to={`/channel/${c.username}`} className="block py-2 hover:bg-yt-hover rounded px-2">
            {c.channelName} (@{c.username})
          </Link>
        ))}
      {tab === 'groups' && Array.isArray(data?.groups) &&
        (data.groups as { id: string; name: string }[]).map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="block py-2">{g.name}</Link>
        ))}
    </div>
  )
}
