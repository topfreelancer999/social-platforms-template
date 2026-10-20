import { api, authHeaders } from '@/lib/api'

export interface ActivityItem {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  link?: string | null
  actor: { id: string; username: string; firstName: string; avatarUrl: string } | null
}

export interface Activity {
  items: ActivityItem[]
  unread: number
  followRequests: { count: number; unread: number; preview: { username: string; avatarUrl: string }[] }
}

export interface FollowRequestRow {
  id: string
  createdAt: string
  user: { id: string; username: string; displayName?: string; firstName: string; lastName: string; avatarUrl: string; isPrivate?: boolean }
}

/** Shared by the header badge and the Notifications page so both read one cache entry. */
export const activityQueryKey = ['notifications'] as const
export const followRequestsQueryKey = ['follow-requests'] as const

export const fetchActivity = (token: string | null) =>
  api<Activity>('/notifications', { headers: authHeaders(token) })

export const fetchFollowRequests = (token: string | null) =>
  api<{ count: number; requests: FollowRequestRow[] }>('/follows/requests', { headers: authHeaders(token) })
