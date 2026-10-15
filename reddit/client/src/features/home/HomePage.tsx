import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'

export function HomePage() {
  const token = useAuthStore((s) => s.accessToken)
  const [sort, setSort] = useState('hot')
  const { data, isLoading } = useQuery({
    queryKey: ['feed', sort],
    queryFn: () => api<{ posts: RedditPost[] }>(`/posts/feed?sort=${sort}`, { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <div className="bg-rd-card border border-rd-border rounded-lg flex mb-3 overflow-hidden text-sm font-semibold">
        {['hot', 'new', 'top'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`flex-1 py-2 capitalize ${sort === s ? 'bg-rd-bg text-rd-orange border-b-2 border-rd-orange' : 'text-rd-muted hover:bg-rd-bg'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-rd-muted text-center py-8">Loading...</p>}
      {data?.posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  )
}
