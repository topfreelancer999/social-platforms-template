import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = params.get('tab') ?? 'contacts'
  const [query, setQuery] = useState(q)
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: authHeaders(token!) }),
    enabled: q.length > 0 && !!token,
  })

  return (
    <div className="h-full flex flex-col bg-wx-header">
      <header className="h-14 px-4 flex items-center">
        <h1 className="text-xl font-medium">Search</h1>
      </header>
      <div className="px-4 pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            window.location.href = `/search?q=${encodeURIComponent(query)}&tab=${tab}`
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, messages, channels..."
            className="w-full bg-wx-panel rounded-lg px-4 py-2 text-sm border border-wx-border"
          />
        </form>
        <div className="flex gap-2 mt-3 flex-wrap">
          {['contacts', 'messages', 'moments', 'channels', 'groups'].map((t) => (
            <Link
              key={t}
              to={`/search?q=${encodeURIComponent(q || query)}&tab=${t}`}
              className={`px-3 py-1 rounded-full text-xs capitalize ${tab === t ? 'bg-wx-green text-white' : 'bg-wx-panel'}`}
            >
              {t}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {tab === 'contacts' && Array.isArray(data?.contacts) &&
          (data.contacts as { id: string; username: string; displayName?: string; firstName: string }[]).map((u) => (
            <Link key={u.id} to={`/profile/${u.username}`} className="block py-2 text-sm border-b border-wx-border/30">
              {u.displayName || u.firstName} (@{u.username})
            </Link>
          ))}
        {tab === 'messages' && Array.isArray(data?.messages) &&
          (data.messages as { content: string; threadId: string }[]).map((m, i) => (
            <Link key={i} to={`/chat/${m.threadId}`} className="block py-2 text-sm border-b border-wx-border/30">
              {m.content}
            </Link>
          ))}
        {tab === 'moments' && Array.isArray(data?.moments) &&
          (data.moments as { id: string; content: string }[]).map((m) => (
            <Link key={m.id} to={`/moments/${m.id}`} className="block py-2 text-sm border-b border-wx-border">{m.content}</Link>
          ))}
      {tab === 'channels' && Array.isArray(data?.channels) &&
          (data.channels as { slug: string; name: string }[]).map((c) => (
            <Link key={c.slug} to={`/channels/${c.slug}`} className="block py-2 text-sm">{c.name}</Link>
          ))}
        {tab === 'groups' && Array.isArray(data?.groups) &&
          (data.groups as { id: string; name: string }[]).map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="block py-2 text-sm">{g.name}</Link>
          ))}
      </div>
    </div>
  )
}
