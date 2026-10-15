import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'people'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: authHeaders(token) }),
    enabled: q.length > 0,
  })
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ q: query, tab })
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-[#eff3f4] dark:bg-[#202327] rounded-full px-4 py-2 outline-none"
            placeholder="Search"
          />
        </form>
        <div className="flex gap-4 mt-3 overflow-x-auto">
          {['people', 'tweets', 'communities', 'pages', 'hashtags'].map((t) => (
            <button
              key={t}
              onClick={() => setParams({ q, tab: t })}
              className={`capitalize text-sm font-semibold whitespace-nowrap ${tab === t ? 'text-x-text-light dark:text-x-text border-b-2 border-x-primary pb-1' : 'text-x-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>
      {data && (
        <div className="divide-y divide-x-border-light dark:divide-x-border">
          {(data.people as { id: string; username: string; firstName: string; lastName: string }[] | undefined)?.map((u) => (
            <Link key={u.id} to={`/profile/${u.username}`} className="block p-4 hover:bg-black/5 dark:hover:bg-white/5">
              {u.firstName} {u.lastName} <span className="text-x-muted">@{u.username}</span>
            </Link>
          ))}
          {(data.tweets as { id: string; content: string }[] | undefined)?.map((t) => (
            <Link key={t.id} to={`/tweet/${t.id}`} className="block p-4 hover:bg-black/5 dark:hover:bg-white/5 text-sm">
              {t.content}
            </Link>
          ))}
          {(data.communities as { id: string; name: string }[] | undefined)?.map((c) => (
            <Link key={c.id} to={`/communities/${c.id}`} className="block p-4 hover:bg-black/5 dark:hover:bg-white/5 font-bold">
              {c.name}
            </Link>
          ))}
          {(data.pages as { slug: string; name: string }[] | undefined)?.map((p) => (
            <Link key={p.slug} to={`/pages/${p.slug}`} className="block p-4 hover:bg-black/5 dark:hover:bg-white/5">
              {p.name}
            </Link>
          ))}
          {(data.hashtags as { tag: string }[] | undefined)?.map((h) => (
            <Link key={h.tag} to={`/hashtag/${h.tag}`} className="block p-4 hover:bg-black/5 dark:hover:bg-white/5 text-x-primary">
              #{h.tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
