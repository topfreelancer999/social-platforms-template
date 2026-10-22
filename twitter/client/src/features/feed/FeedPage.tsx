import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { ThreadComposer } from './ThreadComposer'
import { TweetCard } from './TweetCard'
import type { TimelinePage } from './types'

export function FeedPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [tab, setTab] = useState('for-you')
  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api<{ tag: string; tweetCount: number }[]>('/trending', { headers: authHeaders(accessToken) }),
  })
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam = 1 }) =>
      api<TimelinePage>(`/feed?page=${pageParam}&tab=${tab}`, { headers: authHeaders(accessToken) }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    initialPageParam: 1,
  })
  const tweets = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border">
        <h1 className="text-xl font-bold px-4 py-3">Home</h1>
        <div className="flex">
          {[
            { id: 'for-you', label: 'For you' },
            { id: 'following', label: 'Following' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 relative ${tab === t.id ? 'text-x-text-light dark:text-x-text' : 'text-x-muted'}`}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-x-primary rounded-full" />}
            </button>
          ))}
        </div>
      </header>
      <div className="border-b border-x-border-light dark:border-x-border px-4 pt-4 pb-3">
        <ThreadComposer />
      </div>
      {isLoading && <p className="p-4 text-center text-x-muted text-sm">Loading…</p>}
      {isError && <p className="p-4 text-center text-red-500 text-sm">Couldn't load posts. Try again later.</p>}
      {!isLoading && !isError && tweets.length === 0 && (
        <p className="p-8 text-center text-x-muted text-sm">Nothing to see here yet — follow people to fill your timeline.</p>
      )}
      {tweets.map((t) => (
        <TweetCard key={t.entryId ?? t.id} tweet={t} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="w-full py-4 text-x-primary font-semibold text-sm">
          {isFetchingNextPage ? 'Loading…' : 'Show more'}
        </button>
      )}
      {trending && trending.length > 0 && (
        <div className="hidden xl:block p-4 text-xs text-x-muted">
          Trending: {trending.slice(0, 3).map((h) => `#${h.tag}`).join(' · ')}
        </div>
      )}
    </div>
  )
}
