import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'servers'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: authHeaders(token!) }),
    enabled: q.length > 0 && !!token,
  })
  return (
    <div className="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
        }}
        className="flex gap-2 mb-4"
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-dc-input rounded-lg px-4 py-2 text-sm" placeholder="Search servers, channels, users..." />
        <button type="submit" className="bg-dc-blurple px-4 rounded-lg text-sm font-semibold">Search</button>
      </form>
      <div className="flex gap-2 mb-6 flex-wrap">
        {['servers', 'channels', 'users', 'groups', 'messages'].map((t) => (
          <Link
            key={t}
            to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${tab === t ? 'bg-dc-blurple text-white' : 'bg-dc-sidebar'}`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 'servers' && Array.isArray(data?.servers) &&
        (data.servers as { id: string; name: string; description: string }[]).map((s) => (
          <Link key={s.id} to={`/servers/${s.id}`} className="block py-2 hover:bg-dc-hover rounded px-2">
            {s.name} — <span className="text-dc-muted text-sm">{s.description}</span>
          </Link>
        ))}
      {tab === 'channels' && Array.isArray(data?.channels) &&
        (data.channels as { id: string; name: string; serverId: string; serverName: string }[]).map((c) => (
          <Link key={c.id} to={`/servers/${c.serverId}/channels/${c.id}`} className="block py-2 hover:bg-dc-hover rounded px-2">
            #{c.name} in {c.serverName}
          </Link>
        ))}
      {tab === 'users' && Array.isArray(data?.users) &&
        (data.users as { username: string; displayName?: string; firstName: string }[]).map((u) => (
          <Link key={u.username} to={`/users/${u.username}`} className="block py-2 hover:bg-dc-hover rounded px-2">
            {u.displayName || u.firstName} (@{u.username})
          </Link>
        ))}
      {tab === 'groups' && Array.isArray(data?.groups) &&
        (data.groups as { id: string; name: string }[]).map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="block py-2">{g.name}</Link>
        ))}
      {tab === 'messages' && Array.isArray(data?.messages) &&
        (data.messages as { content: string; channelName: string; serverName: string; channelId: string; serverId: string }[]).map((m, i) => (
          <Link key={i} to={`/servers/${m.serverId}/channels/${m.channelId}`} className="block py-2 text-sm hover:bg-dc-hover rounded px-2">
            <span className="text-dc-muted">#{m.channelName} · {m.serverName}</span>
            <p>{m.content}</p>
          </Link>
        ))}
    </div>
  )
}
