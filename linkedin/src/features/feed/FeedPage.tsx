import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { SPONSORED_EVERY_N } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { PostComposer } from './PostComposer'
import { PostCard } from './PostCard'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Paginated } from '@/types'

export function FeedPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<'recent' | 'network' | 'following'>('recent')

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['feed', filter],
      queryFn: ({ pageParam = 1 }) =>
        api<Paginated<unknown>>(`/feed?page=${pageParam}&filter=${filter}`, {
          headers: authHeaders(),
        }),
      getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
      initialPageParam: 1,
    })

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-2">
      <PostComposer />
      <Card className="flex gap-4 text-sm font-semibold">
        {(['recent', 'network', 'following'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'text-linkedin-primary border-b-2 border-linkedin-primary pb-1'
                : 'text-linkedin-muted'
            }
          >
            {f === 'recent' ? 'Recent' : f === 'network' ? 'My network' : 'Following'}
          </button>
        ))}
      </Card>
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-12 w-12 rounded-full mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      {posts.map((post, i) => (
        <div key={(post as { id: string }).id}>
          <PostCard post={post as Parameters<typeof PostCard>[0]['post']} />
          {(i + 1) % SPONSORED_EVERY_N === 0 && (
            <PostCard
              post={
                {
                  id: `sponsored-${i}`,
                  content: 'Accelerate your career with LinkedIn Premium. Get exclusive insights and InMail.',
                  createdAt: new Date().toISOString(),
                  isSponsored: true,
                  author: user,
                  reactions: [],
                  totalReactions: 0,
                  reactionSummary: {},
                  comments: [],
                } as Parameters<typeof PostCard>[0]['post']
              }
            />
          )}
        </div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm font-semibold text-linkedin-muted hover:bg-gray-100 rounded"
        >
          {isFetchingNextPage ? <Spinner className="mx-auto h-6 w-6" /> : 'Load more'}
        </button>
      )}
    </div>
  )
}
