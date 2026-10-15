import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

export function ChannelPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['channel', slug],
    queryFn: () =>
      api<{
        channel: { name: string; description: string; imageUrl: string; isFollowing: boolean; isOwner: boolean }
        posts: { id: string; imageUrl: string; caption: string }[]
      }>(`/channels/${slug}`, { headers: authHeaders(token!) }),
    enabled: !!slug && !!token,
  })

  const follow = useMutation({
    mutationFn: () =>
      api(`/channels/${slug}/follow`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', slug] }),
  })

  if (isLoading || !data) return <p className="p-4 text-white/60">Loading…</p>

  const { channel, posts } = data

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <img src={channel.imageUrl} alt="" className="h-16 w-16 rounded-full" />
        <div>
          <h1 className="text-xl font-bold">{channel.name}</h1>
          <p className="text-sm text-white/60">{channel.description}</p>
        </div>
      </div>

      {!channel.isFollowing && (
        <Button
          className="mb-4 bg-[var(--sc-yellow)] text-black"
          onClick={() => follow.mutate()}
          disabled={follow.isPending}
        >
          Subscribe
        </Button>
      )}

      {channel.isOwner && user && (
        <p className="mb-2 text-xs text-[var(--sc-yellow)]">You own this channel — post from API/settings</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {posts.map((p) => (
          <div key={p.id} className="relative aspect-[9/16] overflow-hidden rounded-lg">
            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
            {p.caption && (
              <p className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs">{p.caption}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
