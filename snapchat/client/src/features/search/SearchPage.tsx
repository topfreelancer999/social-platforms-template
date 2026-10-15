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
    <div className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
        }}
        className="mb-4 rounded-xl bg-white/10 p-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, channels, groups…"
          className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {['users', 'channels', 'groups', 'snaps'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
              tab === t ? 'bg-[var(--sc-yellow)] text-black' : 'bg-white/10'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'users' &&
        Array.isArray(data?.users) &&
        (data.users as { username: string; displayName?: string }[]).map((u) => (
          <Link key={u.username} to={`/profile/${u.username}`} className="block py-2 text-sm font-semibold">
            @{u.username} {u.displayName && `· ${u.displayName}`}
          </Link>
        ))}
      {tab === 'channels' &&
        Array.isArray(data?.channels) &&
        (data.channels as { slug: string; name: string }[]).map((c) => (
          <Link key={c.slug} to={`/channels/${c.slug}`} className="mb-2 block rounded-lg bg-white/10 p-3">
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
      {tab === 'snaps' &&
        Array.isArray(data?.snaps) &&
        (data.snaps as { id: string; caption: string; author: { username: string } }[]).map((s) => (
          <p key={s.id} className="py-2 text-sm">
            @{s.author.username}: {s.caption || '(no caption)'}
          </p>
        ))}
    </div>
  )
}
