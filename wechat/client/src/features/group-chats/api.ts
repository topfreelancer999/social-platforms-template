import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { PublicUser } from '@/features/contacts/api'

export type ChatRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type GroupMember = PublicUser & {
  role: ChatRole
  alias: string
  /** Alias in group, else display name. */
  groupName: string
  joinedAt: string
}

export type GroupChat = {
  id: string
  name: string | null
  title: string
  memberCount: number
  announcement: { content: string; updatedAt: string | null; by: { id: string; name: string; avatarUrl: string } | null } | null
  me: { role: ChatRole; alias: string; muted: boolean }
  members: GroupMember[]
}

export type InvitePreview = {
  threadId: string
  title: string
  memberCount: number
  avatars: string[]
  inviter: { name: string; avatarUrl: string }
  expiresAt: string
  isMember: boolean
}

export const canManage = (role?: ChatRole) => role === 'OWNER' || role === 'ADMIN'

/** Invalidate everything that shows a group chat after a change. */
function useInvalidateGroup(threadId: string | undefined) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['group-chat', threadId] })
    qc.invalidateQueries({ queryKey: ['thread', threadId] })
    qc.invalidateQueries({ queryKey: ['threads'] })
  }
}

export function useGroupChat(threadId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['group-chat', threadId],
    queryFn: () => api<GroupChat>(`/group-chats/${threadId}`, { headers: authHeaders(token) }),
    enabled: !!token && !!threadId,
    retry: false,
  })
}

export function useCreateGroupChat() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; memberIds: string[] }) =>
      api<{ threadId: string }>('/group-chats', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  })
}

/** PATCH helpers that return the updated group. */
function useGroupMutation<V>(threadId: string | undefined, request: (vars: V) => { path: string; method: string; body?: unknown }) {
  const token = useAuthStore((s) => s.accessToken)
  const invalidate = useInvalidateGroup(threadId)
  return useMutation({
    mutationFn: (vars: V) => {
      const { path, method, body } = request(vars)
      return api<GroupChat>(`/group-chats/${threadId}${path}`, {
        method,
        headers: authHeaders(token),
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    },
    onSuccess: invalidate,
  })
}

export const useRenameGroup = (threadId?: string) =>
  useGroupMutation(threadId, (name: string) => ({ path: '', method: 'PATCH', body: { name } }))

export const useUpdateMySettings = (threadId?: string) =>
  useGroupMutation(threadId, (body: { alias?: string; muted?: boolean }) => ({ path: '/me', method: 'PATCH', body }))

export const useAddMembers = (threadId?: string) =>
  useGroupMutation(threadId, (userIds: string[]) => ({ path: '/members', method: 'POST', body: { userIds } }))

export const useRemoveMember = (threadId?: string) =>
  useGroupMutation(threadId, (userId: string) => ({ path: `/members/${userId}`, method: 'DELETE' }))

export const useSetMemberRole = (threadId?: string) =>
  useGroupMutation(threadId, ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) => ({
    path: `/members/${userId}/role`,
    method: 'PATCH',
    body: { role },
  }))

export const useTransferOwnership = (threadId?: string) =>
  useGroupMutation(threadId, (userId: string) => ({ path: '/transfer', method: 'POST', body: { userId } }))

export const usePostNotice = (threadId?: string) =>
  useGroupMutation(threadId, (content: string) => ({ path: '/announcement', method: 'PUT', body: { content } }))

export function useLeaveGroup(threadId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api(`/group-chats/${threadId}/leave`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['group-chat', threadId] })
      qc.removeQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })
}

/** The caller's group QR code token (reused while valid, renewed weekly). */
export function useGroupInvite(threadId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['group-invite', threadId],
    queryFn: () =>
      api<{ token: string; expiresAt: string }>(`/group-chats/${threadId}/invite`, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    enabled: !!token && !!threadId,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })
}

export function useInvitePreview(inviteToken: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['group-invite-preview', inviteToken],
    queryFn: () => api<InvitePreview>(`/group-chats/invites/${encodeURIComponent(inviteToken!)}`, { headers: authHeaders(token) }),
    enabled: !!token && !!inviteToken,
    retry: false,
  })
}

export function useJoinGroup() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteToken: string) =>
      api<{ threadId: string; alreadyMember: boolean }>(`/group-chats/invites/${encodeURIComponent(inviteToken)}/join`, {
        method: 'POST',
        headers: authHeaders(token),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  })
}

/** Invite links look like `<origin>/group-chat/join/<token>`; a bare token is accepted too. */
export function parseInviteToken(input: string) {
  const text = input.trim()
  const match = text.match(/group-chat\/join\/([A-Za-z0-9_-]+)/)
  if (match) return match[1]
  return /^[A-Za-z0-9_-]{8,}$/.test(text) ? text : null
}

export const inviteUrl = (token: string) => `${window.location.origin}/group-chat/join/${token}`
