import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'users'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)

  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () =>
      api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, {
        headers: authHeaders(token!),
      }),
    enabled: q.length > 0 && !!token,
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-4">
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
          className="w-full rounded-lg border border-black/10 bg-[var(--tg-sidebar)] px-4 py-2 text-sm"
        />
      </form>
      <div className="mb-3 flex flex-wrap gap-2">
        {['users', 'channels', 'groups', 'messages'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              tab === t ? 'bg-[var(--tg-blue)] text-white' : 'bg-[var(--tg-sidebar)]'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'users' &&
        Array.isArray(data?.users) &&
        (data.users as { username: string; displayName?: string }[]).map((u) => (
          <Link key={u.username} to={`/profile/${u.username}`} className="block py-2 font-medium">
            @{u.username}
          </Link>
        ))}
      {tab === 'channels' &&
        Array.isArray(data?.channels) &&
        (data.channels as { slug: string; name: string }[]).map((c) => (
          <Link key={c.slug} to={`/channels/${c.slug}`} className="block py-2">
            {c.name}
          </Link>
        ))}
      {tab === 'groups' &&
        Array.isArray(data?.groups) &&
        (data.groups as { id: string; name: string }[]).map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="block py-2">
            {g.name}
          </Link>
        ))}
    </div>
  )
}
