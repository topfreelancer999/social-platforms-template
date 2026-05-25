import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import { formatCount } from '@/lib/format'
import type { UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Spinner } from '@/components/ui/Spinner'
import { useState } from 'react'

export function ProfilePage() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const [tab, setTab] = useState('about')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: UserPublic
        degree: 1 | 2 | 3 | null
        posts: unknown[]
      }>(`/users/${username}`, { headers: authHeaders() }),
  })

  const connect = useMutation({
    mutationFn: () =>
      api(`/users/${data?.user.id}/connect`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', username] }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  if (!data) return <p>Profile not found</p>

  const { user, degree } = data
  const isMe = me?.id === user.id

  return (
    <div className="space-y-2 max-w-[900px]">
      <Card padding={false}>
        <div
          className="h-32 md:h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${user.coverUrl})` }}
        />
        <div className="px-6 pb-6">
          <div className="-mt-16 mb-4">
            <Avatar
              src={user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="xl"
              className="border-4 border-white"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-linkedin-muted">{user.headline}</p>
              <p className="text-sm text-linkedin-muted mt-1">
                {user.location}
                {degree && ` · ${degree}${degree === 1 ? 'st' : degree === 2 ? 'nd' : 'rd'}`}
              </p>
              <p className="text-sm text-linkedin-primary mt-1">
                {formatCount(user.connectionIds.length)} connections
              </p>
            </div>
            <div className="flex gap-2">
              {isMe ? (
                <Link to={`/in/${user.username}/edit`}>
                  <Button variant="outline">Edit profile</Button>
                </Link>
              ) : (
                <>
                  <Button onClick={() => connect.mutate()}>Connect</Button>
                  <Link to="/messaging">
                    <Button variant="outline">Message</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Card padding={false}>
        <Tabs
          tabs={[
            { id: 'about', label: 'About' },
            { id: 'activity', label: 'Activity' },
            { id: 'experience', label: 'Experience' },
            { id: 'education', label: 'Education' },
            { id: 'skills', label: 'Skills' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="p-6">
          {tab === 'about' && (
            <div>
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-sm whitespace-pre-wrap">{user.about || 'No about section yet.'}</p>
            </div>
          )}
          {tab === 'experience' && (
            <div className="space-y-4">
              {user.experience.map((exp) => (
                <div key={exp.id}>
                  <p className="font-semibold">{exp.title}</p>
                  <p className="text-sm text-linkedin-muted">{exp.company}</p>
                  <p className="text-xs text-linkedin-muted">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </p>
                  {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                </div>
              ))}
            </div>
          )}
          {tab === 'education' && (
            <div className="space-y-4">
              {user.education.map((ed) => (
                <div key={ed.id}>
                  <p className="font-semibold">{ed.school}</p>
                  <p className="text-sm">
                    {ed.degree}
                    {ed.field && `, ${ed.field}`}
                  </p>
                </div>
              ))}
            </div>
          )}
          {tab === 'skills' && (
            <div className="flex flex-wrap gap-2">
              {user.skills.map((s) => (
                <span
                  key={s.id}
                  className="px-3 py-1 bg-linkedin-bg rounded-full text-sm border"
                >
                  {s.name} · {s.endorsements} endorsements
                </span>
              ))}
            </div>
          )}
          {tab === 'activity' && (
            <p className="text-sm text-linkedin-muted">
              {data.posts.length} posts — view on home feed
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
