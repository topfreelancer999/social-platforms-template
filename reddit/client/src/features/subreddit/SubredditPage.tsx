import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'
import { Button } from '@/components/ui/Button'

export function SubredditPage() {
  const { slug } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data: sub } = useQuery({
    queryKey: ['subreddit-meta', slug],
    queryFn: () => api<{ subreddit: { name: string; description: string; bannerUrl: string; iconUrl: string; memberCount: number; isMember: boolean } }>(
      `/subreddits/${slug}`,
      { headers: authHeaders(token!) },
    ),
    enabled: !!slug && !!token,
  })
  const { data: feed } = useQuery({
    queryKey: ['subreddit', slug],
    queryFn: () => api<{ posts: RedditPost[] }>(`/posts/subreddit/${slug}`, { headers: authHeaders(token!) }),
    enabled: !!slug && !!token,
  })
  const join = useMutation({
    mutationFn: () => api(`/subreddits/${slug}/${sub?.subreddit.isMember ? 'leave' : 'join'}`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subreddit-meta', slug] }),
  })

  const s = sub?.subreddit
  return (
    <div>
      {s && (
        <div className="bg-rd-card border border-rd-border rounded-lg overflow-hidden mb-4">
          <img src={s.bannerUrl || 'https://picsum.photos/seed/banner/800/120'} alt="" className="w-full h-24 object-cover" />
          <div className="p-4 flex items-start gap-4">
            <img src={s.iconUrl} alt="" className="w-14 h-14 rounded-full border-4 border-rd-card -mt-10" />
            <div className="flex-1 pt-1">
              <h1 className="text-2xl font-bold">r/{s.name}</h1>
              <p className="text-sm text-rd-muted">{s.memberCount} members · {s.description}</p>
            </div>
            <Button onClick={() => join.mutate()} className="bg-rd-blue text-white">
              {s.isMember ? 'Joined' : 'Join'}
            </Button>
          </div>
        </div>
      )}
      <Link to={`/submit?subreddit=${slug}`} className="block mb-3 text-sm font-semibold text-rd-blue">Create Post</Link>
      {feed?.posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  )
}
