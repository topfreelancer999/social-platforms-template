import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { displayName, type PublicUser } from '@/features/contacts/api'

export type MomentVisibility = 'PUBLIC' | 'PRIVATE' | 'INCLUDE' | 'EXCLUDE'
export type MomentsRange = 'ALL' | 'SIX_MONTHS' | 'ONE_MONTH' | 'THREE_DAYS'

export const RANGE_LABELS: Record<MomentsRange, string> = {
  ALL: 'All',
  SIX_MONTHS: 'Last 6 months',
  ONE_MONTH: 'Last month',
  THREE_DAYS: 'Last 3 days',
}

export type Moment = {
  id: string
  content: string
  imageUrl?: string | null
  location: string
  createdAt: string
  author: PublicUser
  isAuthor: boolean
  /** Only present on the viewer's own Moments. */
  visibility: MomentVisibility | null
  audience: { tags: { id: string; name: string }[]; users: PublicUser[] } | null
  likeCount: number
  commentCount: number
  liked: boolean
  likes: { id: string; user: PublicUser }[]
  comments: { id: string; content: string; createdAt: string; author: PublicUser }[]
}

/** Human-readable audience for the author's own restricted Moments. */
export function visibilitySummary(m: Pick<Moment, 'visibility' | 'audience'>) {
  const names = [...(m.audience?.tags.map((t) => t.name) ?? []), ...(m.audience?.users.map(displayName) ?? [])]
  switch (m.visibility) {
    case 'PRIVATE':
      return 'Private: only visible to you'
    case 'INCLUDE':
      return `Visible to: ${names.join(', ')}`
    case 'EXCLUDE':
      return `Don't share with: ${names.join(', ')}`
    default:
      return null
  }
}

export type NewMoment = {
  content: string
  imageUrl?: string | null
  location?: string
  visibility: MomentVisibility
  tagIds: string[]
  userIds: string[]
}

export function useMomentsFeed() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['moments', 'feed'],
    queryFn: () => api<{ moments: Moment[] }>('/moments/feed', { headers: authHeaders(token) }),
    enabled: !!token,
  })
}

export function useUserMoments(username: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['moments', 'user', username],
    queryFn: () =>
      api<{ user: PublicUser & { coverUrl: string }; isSelf: boolean; isFriend: boolean; range: MomentsRange | null; moments: Moment[] }>(
        `/moments/user/${username}`,
        { headers: authHeaders(token) },
      ),
    enabled: !!token && !!username,
  })
}

export function useMoment(id: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['moments', 'detail', id],
    queryFn: () => api<Moment>(`/moments/${id}`, { headers: authHeaders(token) }),
    enabled: !!token && !!id,
    retry: false,
  })
}

function useMomentsMutation<TVars, TResult = unknown>(fn: (vars: TVars, token: string | null) => Promise<TResult>) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: TVars) => fn(vars, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moments'] }),
  })
}

export const useCreateMoment = () =>
  useMomentsMutation((body: NewMoment, token) =>
    api<Moment>('/moments', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
  )

export const useToggleLike = () =>
  useMomentsMutation((id: string, token) => api(`/moments/${id}/like`, { method: 'POST', headers: authHeaders(token) }))

export const useAddComment = () =>
  useMomentsMutation(({ id, content }: { id: string; content: string }, token) =>
    api(`/moments/${id}/comments`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ content }) }),
  )

export const useDeleteMoment = () =>
  useMomentsMutation((id: string, token) => api(`/moments/${id}`, { method: 'DELETE', headers: authHeaders(token) }))
