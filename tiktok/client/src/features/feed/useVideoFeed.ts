import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { FeedTab, VideoFeedPage, VideoItem } from './types'

const PAGE_LIMIT = 8

export function newFeedSeed() {
  return Math.random().toString(36).slice(2, 10)
}

/** Cursor-paginated vertical feed for one tab. The For You seed keeps ranking stable across pages. */
export function useVideoFeed(tab: FeedTab, seed: string) {
  const token = useAuthStore((s) => s.accessToken)
  return useInfiniteQuery({
    queryKey: ['video-feed', tab, seed],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) })
      if (pageParam) params.set('cursor', pageParam)
      if (tab === 'for-you') params.set('seed', seed)
      return api<VideoFeedPage>(`/feed/${tab}?${params}`, { headers: authHeaders(token) })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 5 * 60_000,
  })
}

/** Apply a change to a video everywhere it is cached (feeds + video detail). */
function patchVideos(qc: QueryClient, match: (v: VideoItem) => boolean, patch: (v: VideoItem) => VideoItem) {
  qc.setQueriesData<InfiniteData<VideoFeedPage>>({ queryKey: ['video-feed'] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({ ...p, items: p.items.map((v) => (match(v) ? patch(v) : v)) })),
        }
      : data,
  )
  qc.setQueriesData<{ video: VideoItem }>({ queryKey: ['video'] }, (data) =>
    data?.video && match(data.video) ? { ...data, video: patch(data.video) } : data,
  )
}

export function useToggleLike() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (video: VideoItem) =>
      api<VideoItem>(`/videos/${video.id}/like`, { method: 'POST', headers: authHeaders(token) }),
    onMutate: (video) =>
      patchVideos(qc, (v) => v.id === video.id, (v) => ({
        ...v,
        liked: !v.liked,
        likeCount: Math.max(0, v.likeCount + (v.liked ? -1 : 1)),
      })),
    onSuccess: (server) =>
      patchVideos(qc, (v) => v.id === server.id, (v) => ({ ...v, liked: server.liked, likeCount: server.likeCount })),
    onError: () => qc.invalidateQueries({ queryKey: ['video-feed'] }),
  })
}

export function useToggleBookmark() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (video: VideoItem) =>
      api<{ bookmarked: boolean; bookmarkCount: number }>(`/videos/${video.id}/bookmark`, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    onMutate: (video) =>
      patchVideos(qc, (v) => v.id === video.id, (v) => ({
        ...v,
        bookmarked: !v.bookmarked,
        bookmarkCount: Math.max(0, (v.bookmarkCount ?? 0) + (v.bookmarked ? -1 : 1)),
      })),
    onSuccess: (server, video) =>
      patchVideos(qc, (v) => v.id === video.id, (v) => ({
        ...v,
        bookmarked: server.bookmarked,
        bookmarkCount: server.bookmarkCount,
      })),
    onError: () => qc.invalidateQueries({ queryKey: ['video-feed'] }),
  })
}

export function useShareVideo() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ video, channel }: { video: VideoItem; channel: 'copy_link' | 'native' }) =>
      api<{ shareCount: number }>(`/videos/${video.id}/share`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ channel }),
      }),
    onSuccess: (server, { video }) =>
      patchVideos(qc, (v) => v.id === video.id, (v) => ({ ...v, shareCount: server.shareCount })),
  })
}

export function useFollowCreator() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (authorId: string) => api(`/follows/${authorId}`, { method: 'POST', headers: authHeaders(token) }),
    onMutate: (authorId) =>
      patchVideos(qc, (v) => v.author.id === authorId, (v) => ({ ...v, author: { ...v.author, following: true } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-feed', 'following'] })
      qc.invalidateQueries({ queryKey: ['follows'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => qc.invalidateQueries({ queryKey: ['video-feed'] }),
  })
}

/** Records a view (called once a video has played on screen for ~2s). */
export function useRecordView() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (videoId: string) =>
      api<{ viewCount: number }>(`/videos/${videoId}/view`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: (server, videoId) =>
      patchVideos(qc, (v) => v.id === videoId, (v) => ({ ...v, viewCount: server.viewCount })),
  })
}

export interface SuggestedCreator {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string
  bio: string
  verified?: boolean
}

export function useSuggestedCreators(enabled: boolean) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['follows'],
    queryFn: () =>
      api<{ following: SuggestedCreator[]; followers: SuggestedCreator[]; suggestions: SuggestedCreator[] }>(
        '/follows',
        { headers: authHeaders(token) },
      ),
    enabled,
  })
}
