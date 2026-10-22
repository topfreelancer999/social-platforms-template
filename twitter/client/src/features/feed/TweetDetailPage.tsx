import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { ThreadComposer } from './ThreadComposer'
import { TweetCard } from './TweetCard'
import type { TweetDetail } from './types'

export function TweetDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  // Remembers which post the composer was opened on, so it closes on navigation.
  const [extendingId, setExtendingId] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tweet', id],
    queryFn: () => api<TweetDetail>(`/tweets/${id}`, { headers: authHeaders(token) }),
  })
  const before = data?.threadBefore ?? []
  const after = data?.threadAfter ?? []
  const isMine = !!data && data.tweet.author.id === me?.id
  const extending = !!data && extendingId === data.tweet.id
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3">
        <h1 className="text-xl font-bold">Post</h1>
      </header>
      {isLoading && <p className="p-4 text-x-muted text-sm">Loading…</p>}
      {isError && (
        <p className="p-4 text-x-muted text-sm">
          {error.message === 'Not found' ? 'This post is unavailable.' : "Couldn't load this post. Try again later."}
        </p>
      )}
      {data && (
        <>
          {before.map((t, i) => (
            <TweetCard key={t.id} tweet={t} thread={{ above: i > 0, below: true }} />
          ))}
          <TweetCard tweet={data.tweet} thread={{ above: before.length > 0 }} />
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
          {after.map((t, i) => (
            <TweetCard key={t.id} tweet={t} thread={{ above: i > 0, below: i < after.length - 1 || isMine }} />
          ))}
          {isMine && (
            <div className={`px-4 pb-3 border-b border-x-border-light dark:border-x-border ${after.length ? '' : 'pt-3'}`}>
              {after.length > 0 && (
                <div className="w-10 flex justify-center" aria-hidden>
                  <div className="w-0.5 h-3 bg-[#cfd9de] dark:bg-[#333639]" />
                </div>
              )}
              {extending ? (
                <ThreadComposer
                  extendId={data.tweet.id}
                  autoFocus
                  onPosted={() => setExtendingId(null)}
                  onCancel={() => setExtendingId(null)}
                />
              ) : (
                <button
                  onClick={() => setExtendingId(data.tweet.id)}
                  className="w-full flex items-center gap-3 text-left group"
                >
                  <Avatar src={me?.avatarUrl} />
                  <span className="flex-1 text-x-muted text-[15px] sm:text-lg group-hover:text-x-text-light dark:group-hover:text-x-text">
                    Add another post
                  </span>
                  <span className="h-8 w-8 rounded-full border border-x-border-light dark:border-x-border text-x-primary flex items-center justify-center group-hover:bg-x-primary/10">
                    <Plus size={18} />
                  </span>
                </button>
              )}
            </div>
          )}
          {data.replies.map((r) => (
            <TweetCard key={r.id} tweet={r} />
          ))}
          {data.replies.length === 0 && !isMine && (
            <p className="p-8 text-center text-x-muted text-sm">No replies yet.</p>
          )}
        </>
      )}
    </div>
  )
}
