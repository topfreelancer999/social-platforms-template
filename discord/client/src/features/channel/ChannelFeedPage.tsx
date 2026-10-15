import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard } from '@/features/feed/PostCard'

export function ChannelFeedPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['channel-feed'],
    queryFn: () => api<{ posts: unknown[] }>('/posts/feed', { headers: authHeaders(token!) }),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Channel posts</h1>
      <p className="text-dc-muted text-sm mb-4">Posts from your communities and friends</p>
      {data?.posts?.map((p) => <PostCard key={(p as { id: string }).id} post={p} />)}
    </div>
  )
}
