import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'posts'
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
        className="bg-rd-card border border-rd-border rounded-lg p-4 mb-4"
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Reddit" className="w-full border border-rd-border rounded px-3 py-2 text-sm" />
      </form>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['posts', 'subreddits', 'users', 'groups'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${tab === t ? 'bg-rd-orange text-white' : 'bg-rd-card border border-rd-border'}`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'posts' && Array.isArray(data?.posts) && (data.posts as RedditPost[]).map((p) => <PostCard key={p.id} post={p} />)}
      {tab === 'subreddits' && Array.isArray(data?.subreddits) &&
        (data.subreddits as { slug: string; name: string; description: string }[]).map((s) => (
          <Link key={s.slug} to={`/r/${s.slug}`} className="block bg-rd-card border border-rd-border rounded-lg p-3 mb-2 hover:border-rd-orange">
            r/{s.name} — {s.description}
          </Link>
        ))}
      {tab === 'users' && Array.isArray(data?.users) &&
        (data.users as { username: string }[]).map((u) => (
          <Link key={u.username} to={`/profile/${u.username}`} className="block py-2 text-sm font-semibold">u/{u.username}</Link>
        ))}
      {tab === 'groups' && Array.isArray(data?.groups) &&
        (data.groups as { id: string; name: string }[]).map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="block py-2">r/{g.name}</Link>
        ))}
    </div>
  )
}
