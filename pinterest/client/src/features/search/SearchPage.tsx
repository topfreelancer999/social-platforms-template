import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PinCard, type PinItem } from '@/components/pins/PinCard'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'pins'
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
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
        }}
        className="mb-6"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pinterest"
          className="w-full max-w-xl rounded-full border border-[var(--pin-border)] bg-[#efefef] px-5 py-3 text-sm outline-none focus:border-[var(--pin-red)]"
        />
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {['pins', 'boards', 'users', 'channels', 'groups'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? 'bg-black text-white' : 'bg-[#efefef]'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'pins' && Array.isArray(data?.pins) && (
        <div className="masonry">
          {(data.pins as PinItem[]).map((p) => (
            <PinCard key={p.id} pin={p} />
          ))}
        </div>
      )}
      {tab === 'boards' &&
        Array.isArray(data?.boards) &&
        (data.boards as { id: string; name: string }[]).map((b) => (
          <Link key={b.id} to={`/board/${b.id}`} className="mb-2 block font-semibold hover:text-[var(--pin-red)]">
            {b.name}
          </Link>
        ))}
      {tab === 'users' &&
        Array.isArray(data?.users) &&
        (data.users as { username: string }[]).map((u) => (
          <Link key={u.username} to={`/profile/${u.username}`} className="block py-2 font-semibold">
            @{u.username}
          </Link>
        ))}
      {tab === 'channels' &&
        Array.isArray(data?.channels) &&
        (data.channels as { slug: string; name: string }[]).map((c) => (
          <Link key={c.slug} to={`/channels/${c.slug}`} className="mb-2 block">
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
