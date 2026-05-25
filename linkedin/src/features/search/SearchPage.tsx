import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Company, Job, UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelative } from '@/lib/format'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'people', label: 'People' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'companies', label: 'Companies' },
  { id: 'posts', label: 'Posts' },
  { id: 'groups', label: 'Groups' },
]

export function SearchPage() {
  const navigate = useNavigate()
  const { tab: tabParam } = useParams()
  const [params] = useSearchParams()
  const tab = tabParam ?? 'all'
  const q = params.get('q') ?? ''
  const [query, setQuery] = useState(q)

  type SearchResults = {
    people?: UserPublic[]
    jobs?: (Job & { company?: Company })[]
    companies?: Company[]
    posts?: { id: string; content: string; author: UserPublic }[]
    groups?: { id: string; name: string; description: string }[]
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', tab, q],
    queryFn: () =>
      api<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=${tab}`),
    enabled: q.length > 0,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/search/${tab}?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="max-w-[800px] space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, jobs, companies..."
          className="flex-1 border rounded-full px-4 py-2 text-sm"
        />
        <button type="submit" className="bg-linkedin-primary text-white px-6 py-2 rounded-full text-sm font-semibold">
          Search
        </button>
      </form>
      <Tabs
        tabs={tabs}
        active={tab}
        onChange={(id) => navigate(`/search/${id}?q=${encodeURIComponent(q)}`)}
      />
      {!q && <p className="text-linkedin-muted text-sm">Enter a search term to see results.</p>}
      {isLoading && <Spinner className="mx-auto" />}
      {data && (
        <div className="space-y-4">
          {(tab === 'all' || tab === 'people') &&
            data.people?.map((u) => (
              <Card key={u.id} className="flex gap-3">
                <Link to={`/in/${u.username}`}>
                  <Avatar src={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} />
                </Link>
                <div>
                  <Link to={`/in/${u.username}`} className="font-semibold hover:underline">
                    {u.firstName} {u.lastName}
                  </Link>
                  <p className="text-sm text-linkedin-muted">{u.headline}</p>
                  <p className="text-xs text-linkedin-muted">{u.location}</p>
                </div>
              </Card>
            ))}
          {(tab === 'all' || tab === 'jobs') &&
            data.jobs?.map((j) => (
              <Card key={j.id}>
                <Link to={`/jobs/${j.id}`} className="font-semibold hover:underline">
                  {j.title}
                </Link>
                <p className="text-sm text-linkedin-muted">
                  {j.company?.name} · {j.location}
                </p>
                <p className="text-xs text-linkedin-muted">{formatRelative(j.postedAt)}</p>
              </Card>
            ))}
          {(tab === 'all' || tab === 'companies') &&
            data.companies?.map((c) => (
              <Card key={c.id} className="flex gap-3">
                <img src={c.logoUrl} alt="" className="w-12 h-12 rounded" />
                <div>
                  <Link to={`/company/${c.slug}`} className="font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-sm text-linkedin-muted">{c.industry}</p>
                </div>
              </Card>
            ))}
          {(tab === 'all' || tab === 'posts') &&
            data.posts?.map((p) => (
                <Card key={p.id}>
                  <p className="text-xs text-linkedin-muted mb-1">
                    {p.author.firstName} {p.author.lastName}
                  </p>
                  <p className="text-sm line-clamp-3">{p.content}</p>
                </Card>
            ))}
          {(tab === 'all' || tab === 'groups') &&
            data.groups?.map((g) => (
                <Card key={g.id}>
                  <Link to={`/groups/${g.id}`} className="font-semibold hover:underline">
                    {g.name}
                  </Link>
                  <p className="text-sm text-linkedin-muted line-clamp-2">{g.description}</p>
                </Card>
            ))}
        </div>
      )}
    </div>
  )
}
