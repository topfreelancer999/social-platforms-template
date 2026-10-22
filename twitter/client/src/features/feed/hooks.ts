import { useInfiniteQuery, useMutation, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { ThreadResult, TimelinePage, Tweet } from './types'

/** Query roots whose cached data may contain tweets. */
const TWEET_QUERY_ROOTS = new Set(['feed', 'profile', 'tweet', 'quotes', 'community'])
const isTweetQuery = (q: Query) => TWEET_QUERY_ROOTS.has(String(q.queryKey[0]))

export function invalidateTweetQueries(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: isTweetQuery })
}

/** Deep-patches every cached copy of tweet `id`, preserving references for untouched branches. */
function patchTweets(data: unknown, id: string, patch: (t: Tweet) => Tweet): unknown {
  if (Array.isArray(data)) {
    let changed = false
    const next = data.map((item) => {
      const n = patchTweets(item, id, patch)
      if (n !== item) changed = true
      return n
    })
    return changed ? next : data
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    let next = obj
    if (obj.id === id && 'retweetCount' in obj) next = patch(obj as unknown as Tweet) as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(next)) {
      const n = patchTweets(value, id, patch)
      if (n !== value) {
        if (next === obj) next = { ...obj }
        next[key] = n
      }
    }
    return next
  }
  return data
}

/** Repost / undo repost with an optimistic count + active-state update. */
export function useRepost() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      api<Tweet>(`/tweets/${id}/repost`, { method: on ? 'POST' : 'DELETE', headers: authHeaders(token) }),
    onMutate: async ({ id, on }) => {
      const filters = { predicate: isTweetQuery }
      await qc.cancelQueries(filters)
      const snapshot = qc.getQueriesData(filters)
      qc.setQueriesData(filters, (old: unknown) =>
        patchTweets(old, id, (t) =>
          t.retweeted === on ? t : { ...t, retweeted: on, retweetCount: Math.max(0, t.retweetCount + (on ? 1 : -1)) },
        ),
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => invalidateTweetQueries(qc),
  })
}

export function useLike() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<Tweet>(`/tweets/${id}/like`, { method: 'POST', headers: authHeaders(token) }),
    onSettled: () => invalidateTweetQueries(qc),
  })
}

export function useCreateTweet() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { content: string; quoteTweetId?: string; replyToId?: string; communityId?: string }) =>
      api<Tweet>('/tweets', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
    onSuccess: () => invalidateTweetQueries(qc),
  })
}

/** Publish a multi-post thread (all posts or none). */
export function useCreateThread() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { posts: { content: string }[]; communityId?: string }) =>
      api<ThreadResult>('/tweets/thread', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
    onSuccess: () => invalidateTweetQueries(qc),
  })
}

/** "Add another post" to your own thread containing `id`. */
export function useExtendThread() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, posts }: { id: string; posts: { content: string }[] }) =>
      api<ThreadResult>(`/tweets/${id}/thread`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ posts }),
      }),
    onSuccess: () => invalidateTweetQueries(qc),
  })
}

export function useQuotes(id: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useInfiniteQuery({
    queryKey: ['quotes', id],
    queryFn: ({ pageParam }) =>
      api<TimelinePage>(`/tweets/${id}/quotes?page=${pageParam}`, { headers: authHeaders(token) }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!id,
  })
}
