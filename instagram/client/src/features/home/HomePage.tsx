import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { StoriesBar } from '@/components/stories/StoriesBar'
import { PostCard, type IgPost } from '@/features/feed/PostCard'

export function HomePage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api<{ posts: IgPost[] }>('/posts/feed', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div className="max-w-[470px] mx-auto">
      <StoriesBar />
      {isLoading && <p className="text-center text-ig-muted py-8">Loading feed...</p>}
      {data?.posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  )
}
