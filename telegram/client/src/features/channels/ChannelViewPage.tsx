import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { rel } from '@/lib/format'

export function ChannelViewPage() {
  const { slug } = useParams<{ slug: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['channel', slug],
    queryFn: () =>
      api<{
        channel: { name: string; description: string; imageUrl: string; isSubscribed: boolean; subscriberCount: number }
        posts: { id: string; content: string; imageUrl: string | null; createdAt: string }[]
      }>(`/channels/${slug}`, { headers: authHeaders(token!) }),
    enabled: !!slug && !!token,
  })

  const subscribe = useMutation({
    mutationFn: () =>
      api(`/channels/${slug}/subscribe`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', slug] }),
  })

  if (!data) return <p className="p-4 text-sm text-[var(--tg-muted)]">Loading…</p>

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="border-b border-black/5 p-4">
        <Link to="/channels" className="text-sm text-[var(--tg-blue)] md:hidden">
          ← Channels
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <img src={data.channel.imageUrl} alt="" className="h-14 w-14 rounded-full" />
          <div>
            <h1 className="font-bold">{data.channel.name}</h1>
            <p className="text-sm text-[var(--tg-muted)]">{data.channel.subscriberCount} subscribers</p>
          </div>
        </div>
        <p className="mt-2 text-sm">{data.channel.description}</p>
        {!data.channel.isSubscribed && (
          <Button
            className="mt-3 rounded-full bg-[var(--tg-blue)] text-white"
            onClick={() => subscribe.mutate()}
          >
            Join channel
          </Button>
        )}
      </div>
      <div className="space-y-0">
        {data.posts.map((p) => (
          <article key={p.id} className="border-b border-black/5 px-4 py-3">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-2 max-h-64 w-full rounded-lg object-cover" />}
            <p className="whitespace-pre-wrap text-sm">{p.content}</p>
            <p className="mt-1 text-xs text-[var(--tg-muted)]">{rel(p.createdAt)}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
