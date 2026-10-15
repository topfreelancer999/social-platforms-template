import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function ChannelPage() {
  const { slug } = useParams<{ slug: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['channel', slug],
    queryFn: () =>
      api<{
        channel: { name: string; description: string; imageUrl: string; isFollowing: boolean }
        posts: { id: string; title: string; caption: string; imageUrl: string }[]
      }>(`/channels/${slug}`, { headers: authHeaders(token!) }),
    enabled: !!slug && !!token,
  })

  const follow = useMutation({
    mutationFn: () =>
      api(`/channels/${slug}/follow`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', slug] }),
  })

  if (!data) return <p className="text-[var(--pin-gray)]">Loading…</p>

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <img src={data.channel.imageUrl} alt="" className="h-20 w-20 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{data.channel.name}</h1>
          <p className="text-[var(--pin-gray)]">{data.channel.description}</p>
        </div>
        {!data.channel.isFollowing && (
          <Button className="rounded-full bg-[var(--pin-red)] text-white" onClick={() => follow.mutate()}>
            Follow channel
          </Button>
        )}
      </div>
      <div className="masonry">
        {data.posts.map((p) => (
          <article key={p.id} className="masonry-item overflow-hidden rounded-2xl">
            <img src={p.imageUrl} alt={p.title} className="w-full" />
            <div className="p-2">
              <p className="font-semibold text-sm">{p.title}</p>
              {p.caption && <p className="text-xs text-[var(--pin-gray)]">{p.caption}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
