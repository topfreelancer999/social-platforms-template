import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Sound, SoundDetail, SoundSort, SoundVideosPage } from './types'

export function useSound(id: string | null | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['sound', id],
    queryFn: () => api<SoundDetail>(`/sounds/${encodeURIComponent(id!)}`, { headers: authHeaders(token) }),
    enabled: !!id,
    retry: (count, err) => err.message !== 'Sound not found' && count < 2,
  })
}

/** Offset-paginated grid of videos that use a sound. */
export function useSoundVideos(id: string | undefined, sort: SoundSort) {
  const token = useAuthStore((s) => s.accessToken)
  return useInfiniteQuery({
    queryKey: ['sound-videos', id, sort],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ sort })
      if (pageParam) params.set('cursor', pageParam)
      return api<SoundVideosPage>(`/sounds/${encodeURIComponent(id!)}/videos?${params}`, {
        headers: authHeaders(token),
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!id,
  })
}

/** Sound library search used by the upload picker and Discover. */
export function useSoundSearch(q: string, limit = 20) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['sounds', q, limit],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (q) params.set('q', q)
      return api<Sound[]>(`/sounds?${params}`, { headers: authHeaders(token) })
    },
    placeholderData: (prev) => prev,
  })
}

export function useFavoriteSounds(enabled = true) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['sound-favorites'],
    queryFn: () => api<Sound[]>('/sounds/favorites', { headers: authHeaders(token) }),
    enabled,
  })
}

/** Apply a change to a sound in every cached list and detail. */
function patchSound(qc: QueryClient, id: string, patch: (s: Sound) => Sound) {
  qc.setQueriesData<SoundDetail>({ queryKey: ['sound', id] }, (data) => (data ? { ...data, ...patch(data) } : data))
  qc.setQueriesData<Sound[]>({ queryKey: ['sounds'] }, (data) => data?.map((s) => (s.id === id ? patch(s) : s)))
}

export function useToggleSoundFavorite() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sound: Pick<Sound, 'id'>) =>
      api<{ favorited: boolean; favoriteCount: number }>(`/sounds/${sound.id}/favorite`, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    onMutate: (sound) =>
      patchSound(qc, sound.id, (s) => ({
        ...s,
        favorited: !s.favorited,
        favoriteCount: Math.max(0, s.favoriteCount + (s.favorited ? -1 : 1)),
      })),
    onSuccess: (server, sound) => patchSound(qc, sound.id, (s) => ({ ...s, ...server })),
    onError: (_err, sound) => qc.invalidateQueries({ queryKey: ['sound', sound.id] }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['sound-favorites'] }),
  })
}
