import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export type PublicUser = {
  id: string
  username: string
  displayName?: string
  firstName: string
  lastName?: string
  avatarUrl: string
  phone?: string
}

export type Contact = PublicUser & {
  blockMyMoments: boolean
  hideTheirMoments: boolean
  tags: { id: string; name: string }[]
}

export type ContactTag = {
  id: string
  name: string
  memberCount: number
  members: PublicUser[]
}

export const displayName = (u: Pick<PublicUser, 'displayName' | 'firstName'>) => u.displayName || u.firstName

export function useContacts() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => api<{ contacts: Contact[] }>('/contacts', { headers: authHeaders(token) }),
    enabled: !!token,
  })
}

export function useAddContact() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api('/contacts', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['moments'] })
    },
  })
}

export function useUpdateContactMoments() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...body }: { userId: string; blockMyMoments?: boolean; hideTheirMoments?: boolean }) =>
      api(`/contacts/${userId}/moments`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['moments'] })
    },
  })
}

export function useTags() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['contact-tags'],
    queryFn: () => api<{ tags: ContactTag[] }>('/contacts/tags', { headers: authHeaders(token) }),
    enabled: !!token,
  })
}

export function useTag(id: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['contact-tags', id],
    queryFn: () => api<ContactTag>(`/contacts/tags/${id}`, { headers: authHeaders(token) }),
    enabled: !!token && !!id,
  })
}

export function useSaveTag() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; memberIds: string[] }) =>
      api<ContactTag>(id ? `/contacts/tags/${id}` : '/contacts/tags', {
        method: id ? 'PATCH' : 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-tags'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useDeleteTag() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/contacts/tags/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-tags'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
