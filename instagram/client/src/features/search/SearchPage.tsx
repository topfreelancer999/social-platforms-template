import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { IgPost } from '@/features/feed/PostCard'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'users'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: authHeaders(token!) }),
    enabled: q.length > 0 && !!token,
  })

  return (
    <div className="max-w-lg mx-auto p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
        }}
        className="mb-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full bg-ig-surface border border-ig-border rounded-lg px-4 py-2 text-sm"
        />
      </form>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['users', 'posts', 'tags', 'groups'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`px-3 py-1 rounded-full text-sm capitalize ${tab === t ? 'bg-ig-blue text-white' : 'bg-ig-surface'}`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'users' && Array.isArray(data?.users) &&
        (data.users as { username: string; displayName?: string; firstName: string; avatarUrl: string }[]).map((u) => (
          <Link key={u.username} to={`/profile/${u.username}`} className="flex items-center gap-3 py-2 hover:bg-ig-hover rounded-lg px-2">
            <img src={u.avatarUrl} alt="" className="w-11 h-11 rounded-full" />
            <div>
              <p className="font-semibold text-sm">{u.username}</p>
              <p className="text-ig-muted text-sm">{u.displayName || u.firstName}</p>
            </div>
          </Link>
        ))}
      {tab === 'posts' && Array.isArray(data?.posts) &&
        (data.posts as IgPost[]).map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="block py-2 text-sm hover:bg-ig-hover rounded px-2">
            @{p.author.username}: {p.caption.slice(0, 80)}
          </Link>
        ))}
      {tab === 'tags' && Array.isArray(data?.tags) &&
        (data.tags as IgPost[]).map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="block py-2 text-sm">{p.caption}</Link>
        ))}
      {tab === 'groups' && Array.isArray(data?.groups) &&
        (data.groups as { id: string; name: string }[]).map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="block py-2">{g.name}</Link>
        ))}
    </div>
  )
}
