import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'
import { SortTabs, type PostSort } from '@/components/posts/SortTabs'

export function HomePage() {
  const token = useAuthStore((s) => s.accessToken)
  const [sort, setSort] = useState<PostSort>('hot')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['feed', sort],
    queryFn: () => api<{ posts: RedditPost[] }>(`/posts/feed?sort=${sort}`, { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <SortTabs value={sort} onChange={setSort} />
      {isLoading && <p className="text-rd-muted text-center py-8">Loading...</p>}
      {isError && (
        <p className="text-center py-8 text-sm text-rd-muted">
          Couldn't load posts.{' '}
          <button type="button" onClick={() => refetch()} className="text-rd-blue font-semibold hover:underline">
            Try again
          </button>
        </p>
      )}
      {data?.posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  )
}
