import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'

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
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setParams({ q: query, tab }) }} className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 border rounded-full px-4 py-2" placeholder="Search Facebook" />
        <button type="submit" className="bg-fb-primary text-white px-6 rounded-full font-semibold">Search</button>
      </form>
      <div className="flex gap-2">
        {['people', 'groups', 'posts', 'pages'].map((t) => (
          <button key={t} onClick={() => setParams({ q, tab: t })} className={`px-4 py-2 rounded-full capitalize text-sm font-semibold ${tab === t ? 'bg-fb-primary text-white' : 'bg-fb-card'}`}>{t}</button>
        ))}
      </div>
      {data && (
        <Card className="p-4 space-y-2">
          {(data.people as { id: string; username: string; firstName: string; lastName: string }[] | undefined)?.map((u) => (
            <Link key={u.id} to={`/profile/${u.username}`} className="block hover:bg-[#f0f2f5] p-2 rounded">{u.firstName} {u.lastName}</Link>
          ))}
          {(data.groups as { id: string; name: string }[] | undefined)?.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="block hover:bg-[#f0f2f5] p-2 rounded">{g.name}</Link>
          ))}
          {(data.pages as { slug: string; name: string }[] | undefined)?.map((p) => (
            <Link key={p.slug} to={`/pages/${p.slug}`} className="block hover:bg-[#f0f2f5] p-2 rounded">{p.name}</Link>
          ))}
        </Card>
      )}
    </div>
  )
}
