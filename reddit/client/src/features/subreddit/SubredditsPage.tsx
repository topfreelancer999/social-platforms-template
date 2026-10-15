import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function SubredditsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => api<{ subreddits: { slug: string; name: string; description: string; iconUrl: string; memberCount: number }[] }>('/subreddits', {
      headers: authHeaders(token!),
    }),
    enabled: !!token,
  })

  const create = useMutation({
    mutationFn: (name: string) =>
      api('/subreddits', { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subreddits'] }),
  })

  return (
    <div>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Communities</h1>
        <Button
          onClick={() => {
            const name = prompt('Subreddit name?')
            if (name) create.mutate(name)
          }}
          className="bg-rd-orange text-white text-sm"
        >
          Create Community
        </Button>
      </div>
      <div className="space-y-2">
        {data?.subreddits.map((s) => (
          <Link
            key={s.slug}
            to={`/r/${s.slug}`}
            className="flex items-center gap-3 bg-rd-card border border-rd-border rounded-lg p-4 hover:border-rd-orange"
          >
            <img src={s.iconUrl} alt="" className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-semibold">r/{s.name}</p>
              <p className="text-sm text-rd-muted">{s.memberCount} members · {s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
