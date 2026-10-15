import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { TweetCard } from './TweetCard'
import type { Tweet } from './types'

export function TweetDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tweet', id],
    queryFn: () => api<{ tweet: Tweet; replies: Tweet[] }>(`/tweets/${id}`, { headers: authHeaders(token) }),
  })
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3">
        <h1 className="text-xl font-bold">Post</h1>
      </header>
      {isLoading && <p className="p-4 text-x-muted text-sm">Loading…</p>}
      {isError && <p className="p-4 text-x-muted text-sm">This post is unavailable.</p>}
      {data && (
        <>
          <TweetCard tweet={data.tweet} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-3 border-b border-x-border-light dark:border-x-border text-sm text-x-muted">
            <span>
              <strong className="text-x-text-light dark:text-x-text">{data.tweet.retweetCount}</strong> Reposts
            </span>
            <Link to={`/tweet/${data.tweet.id}/quotes`} className="hover:underline">
              <strong className="text-x-text-light dark:text-x-text">{data.tweet.quoteCount ?? 0}</strong> Quotes
            </Link>
            <span>
              <strong className="text-x-text-light dark:text-x-text">{data.tweet.likeCount}</strong> Likes
            </span>
          </div>
          {data.replies.map((r) => (
            <TweetCard key={r.id} tweet={r} />
          ))}
        </>
      )}
    </div>
  )
}
