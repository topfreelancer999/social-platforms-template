import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { ConfirmSheet, Sheet } from '@/components/ui/Sheet'
import type { FollowList, ProfileUser } from './types'

/** Followers / following modal. On your own followers list each row gets "Remove". */
export function FollowListSheet({
  username,
  list,
  canRemove,
  onClose,
}: {
  username: string
  list: FollowList
  canRemove: boolean
  onClose: () => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [removing, setRemoving] = useState<ProfileUser | null>(null)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['follow-list', username, list],
    queryFn: () => api<{ users: ProfileUser[] }>(`/users/${username}/${list}`, { headers: authHeaders(token) }),
  })
  const remove = useMutation({
    mutationFn: (userId: string) =>
      api(`/follows/followers/${userId}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: () => {
      setRemoving(null)
      qc.invalidateQueries({ queryKey: ['follow-list', username] })
      qc.invalidateQueries({ queryKey: ['profile', username] })
    },
  })

  if (removing) {
    return (
      <ConfirmSheet
        title="Remove follower?"
        image={removing.avatarUrl}
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        error={remove.error?.message}
        onConfirm={() => remove.mutate(removing.id)}
        onCancel={() => {
          remove.reset()
          setRemoving(null)
        }}
      >
        Instagram won't tell {removing.username} they were removed from your followers.
      </ConfirmSheet>
    )
  }

  return (
    <Sheet onClose={onClose} labelledBy="follow-list-title" className="max-h-[80vh] flex flex-col">
      <div className="relative flex items-center justify-center h-11 border-b border-ig-border-strong shrink-0">
        <h2 id="follow-list-title" className="font-semibold capitalize">{list}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 p-1 hover:opacity-70">
          <X size={22} />
        </button>
      </div>
      <div className="overflow-y-auto min-h-40 py-2">
        {isLoading && <p className="text-center text-sm text-ig-muted py-8">Loading…</p>}
        {isError && (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-ig-muted">{error.message}</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-semibold text-ig-blue">Try again</button>
          </div>
        )}
        {data && data.users.length === 0 && (
          <p className="text-center text-sm text-ig-muted py-8">
            {list === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        )}
        {data?.users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-2">
            <Link to={`/profile/${u.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
              <img src={u.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1 truncate">
                  <span className="truncate">{u.username}</span>
                  {u.isPrivate && <Lock size={12} aria-label="Private account" className="shrink-0" />}
                </p>
                <p className="text-sm text-ig-muted truncate">{u.displayName || `${u.firstName} ${u.lastName}`}</p>
              </div>
            </Link>
            {canRemove && (
              <button
                type="button"
                onClick={() => setRemoving(u)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-ig-button hover:bg-ig-button-hover shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
