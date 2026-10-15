import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { TweetCard } from './TweetCard'
import { useCreateTweet } from './hooks'
import type { TimelinePage } from './types'

export function FeedPage() {
  const { user, accessToken } = useAuthStore()
  const [tab, setTab] = useState('for-you')
  const [text, setText] = useState('')
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
  const createTweet = useCreateTweet()
  const tweets = data?.pages.flatMap((p) => p.items) ?? []
  const remaining = 280 - text.length
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
      <div className="border-b border-x-border-light dark:border-x-border p-4 flex gap-3">
        <Avatar src={user?.avatarUrl} size="lg" />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            className="w-full bg-transparent text-lg outline-none resize-none min-h-[80px] placeholder:text-x-muted"
            placeholder="What is happening?!"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs ${remaining < 20 ? 'text-orange-500' : 'text-x-muted'}`}>{remaining}</span>
            <button
              onClick={() => text.trim() && createTweet.mutate({ content: text }, { onSuccess: () => setText('') })}
              disabled={!text.trim() || createTweet.isPending}
              className="bg-x-primary hover:bg-x-primary-hover text-white font-bold rounded-full px-4 py-1.5 text-sm disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
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
