import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { TweetCard } from '@/features/feed/TweetCard'

export function GroupDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['community', id],
    queryFn: () =>
      api<{ group: { name: string; description: string }; isMember: boolean; tweets: unknown[] }>(
        `/communities/${id}`,
        { headers: authHeaders(token) },
      ),
  })
  const toggle = useMutation({
    mutationFn: () =>
      api(`/communities/${id}/${data?.isMember ? 'leave' : 'join'}`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', id] }),
  })
  if (!data) return null
  return (
    <div>
      <header className="p-4 border-b border-x-border-light dark:border-x-border">
        <h1 className="text-xl font-bold">{data.group.name}</h1>
        <p className="text-x-muted text-sm mt-1">{data.group.description}</p>
        <Button className="mt-3 rounded-full" onClick={() => toggle.mutate()}>
          {data.isMember ? 'Leave' : 'Join'}
        </Button>
      </header>
      {data.tweets.map((t) => (
        <TweetCard key={(t as { id: string }).id} tweet={t} />
      ))}
    </div>
  )
}
