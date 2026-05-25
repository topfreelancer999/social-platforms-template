import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { Company, Job, UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { Link } from 'react-router-dom'

export function CompanyPage() {
  const { slug } = useParams()
  const [tab, setTab] = useState('about')

  const { data, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () =>
      api<{
        company: Company
        posts: unknown[]
        jobs: Job[]
        people: UserPublic[]
      }>(`/companies/${slug}`),
  })

  const follow = useMutation({
    mutationFn: () =>
      api(`/companies/${data?.company.id}/follow`, {
        method: 'POST',
        headers: authHeaders(),
      }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  if (!data) return <p>Company not found</p>

  const { company, jobs, people } = data

  return (
    <div className="max-w-[900px] space-y-2">
      <Card padding={false}>
        <div
          className="h-32 bg-cover bg-center"
          style={{ backgroundImage: `url(${company.bannerUrl})` }}
        />
        <div className="p-6 flex gap-4">
          <img src={company.logoUrl} alt="" className="w-20 h-20 rounded border -mt-12 bg-white" />
          <div className="flex-1 pt-2">
            <h1 className="text-2xl font-semibold">{company.name}</h1>
            <p className="text-linkedin-muted">{company.tagline}</p>
            <p className="text-sm text-linkedin-muted mt-1">
              {company.industry} · {company.size} · {company.headquarters}
            </p>
            <p className="text-sm text-linkedin-primary mt-1">
              {company.followerIds.length} followers
            </p>
          </div>
          <Button variant="outline" onClick={() => follow.mutate()}>
            + Follow
          </Button>
        </div>
      </Card>
      <Card padding={false}>
        <Tabs
          tabs={[
            { id: 'about', label: 'About' },
            { id: 'posts', label: 'Posts' },
            { id: 'jobs', label: 'Jobs' },
            { id: 'people', label: 'People' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="p-6">
          {tab === 'about' && (
            <>
              <p className="text-sm whitespace-pre-wrap mb-4">{company.about}</p>
              <h3 className="font-semibold text-sm mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {company.specialties.map((s) => (
                  <span key={s} className="px-3 py-1 bg-linkedin-bg rounded-full text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
          {tab === 'jobs' &&
            jobs.map((j) => (
              <div key={j.id} className="mb-3">
                <Link to={`/jobs/${j.id}`} className="font-semibold hover:underline">
                  {j.title}
                </Link>
                <p className="text-sm text-linkedin-muted">{j.location}</p>
              </div>
            ))}
          {tab === 'people' &&
            people.map((u) => (
              <div key={u.id} className="flex gap-3 mb-3">
                <Link to={`/in/${u.username}`}>
                  <Avatar src={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} />
                </Link>
                <div>
                  <Link to={`/in/${u.username}`} className="font-semibold text-sm hover:underline">
                    {u.firstName} {u.lastName}
                  </Link>
                  <p className="text-xs text-linkedin-muted">{u.headline}</p>
                </div>
              </div>
            ))}
          {tab === 'posts' && (
            <p className="text-sm text-linkedin-muted">{data.posts.length} company posts</p>
          )}
        </div>
      </Card>
    </div>
  )
}
