import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

export function ChannelDetailPage() {
  const { slug } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['channel', slug],
    queryFn: () =>
      api<{
        channel: { name: string; description: string; imageUrl: string; isFollowing: boolean; isOwner: boolean; followerCount: number }
        posts: { id: string; content: string; imageUrl?: string; createdAt: string }[]
      }>(`/channels/${slug}`, { headers: authHeaders(token!) }),
    enabled: !!slug && !!token,
  })

  const follow = useMutation({
    mutationFn: () => {
      const method = data?.channel.isFollowing ? 'DELETE' : 'POST'
      return api(`/channels/${slug}/follow`, { method, headers: authHeaders(token!) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', slug] }),
  })

  if (!data) return <p className="p-4 text-wx-muted">Loading...</p>
  const { channel, posts } = data

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <img src={channel.imageUrl} alt="" className="w-20 h-20 rounded-full" />
        <div>
          <h1 className="text-xl font-semibold">{channel.name}</h1>
          <p className="text-wx-muted text-sm">{channel.followerCount} followers</p>
          <p className="text-sm mt-1">{channel.description}</p>
          {!channel.isOwner && (
            <button type="button" onClick={() => follow.mutate()} className="mt-2 text-wx-green font-semibold text-sm">
              {channel.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="bg-wx-incoming rounded-lg p-4">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="rounded-lg mb-2 w-full" />}
            <p>{p.content}</p>
            <p className="text-xs text-wx-muted mt-2">{rel(p.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
