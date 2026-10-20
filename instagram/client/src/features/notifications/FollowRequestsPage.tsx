import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Lock, UserPlus } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { activityQueryKey, fetchFollowRequests, followRequestsQueryKey } from './activity'

export function FollowRequestsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: followRequestsQueryKey,
    queryFn: async () => {
      const res = await fetchFollowRequests(token)
      // The server marks request notifications seen when the inbox loads; refresh the badge.
      qc.invalidateQueries({ queryKey: activityQueryKey })
      return res
    },
    enabled: !!token,
  })
  const settle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'delete' }) =>
      api(action === 'confirm' ? `/follows/requests/${id}/accept` : `/follows/requests/${id}`, {
        method: action === 'confirm' ? 'POST' : 'DELETE',
        headers: authHeaders(token),
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: followRequestsQueryKey })
      qc.invalidateQueries({ queryKey: activityQueryKey })
      // Follower count on your own profile changes after Confirm.
      if (me) qc.invalidateQueries({ queryKey: ['profile', me.username] })
    },
  })

  return (
    <div className="max-w-[600px] mx-auto py-2">
      <div className="relative flex items-center justify-center h-12 px-4 border-b border-ig-border">
        <button type="button" onClick={() => navigate('/notifications')} aria-label="Back" className="absolute left-2 p-1.5 hover:opacity-70">
          <ChevronLeft size={26} />
        </button>
        <h1 className="font-semibold">Follow requests</h1>
      </div>

      {isLoading && <p className="text-center text-ig-muted py-8">Loading...</p>}
      {isError && (
        <div className="text-center py-8">
          <p className="text-sm text-ig-muted">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-semibold text-ig-blue">Try again</button>
        </div>
      )}
      {settle.error && <p role="alert" className="text-sm text-ig-danger px-4 pt-3">{settle.error.message}</p>}
      {data && data.requests.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">
            <UserPlus size={28} />
          </div>
          <p className="font-semibold">No pending requests</p>
          <p className="text-sm text-ig-muted">When people ask to follow you, you'll see their requests here.</p>
        </div>
      )}
      {data?.requests.map((r) => {
        const busy = settle.isPending && settle.variables?.id === r.id
        return (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <Link to={`/profile/${r.user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <img src={r.user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1">
                  <span className="truncate">{r.user.username}</span>
                  {r.user.isPrivate && <Lock size={12} aria-label="Private account" className="shrink-0" />}
                </p>
                <p className="text-sm text-ig-muted truncate">
                  {r.user.displayName || `${r.user.firstName} ${r.user.lastName}`} · {rel(r.createdAt)}
                </p>
              </div>
            </Link>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => settle.mutate({ id: r.id, action: 'confirm' })}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold bg-ig-blue hover:bg-ig-blue-hover text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => settle.mutate({ id: r.id, action: 'delete' })}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold bg-ig-button hover:bg-ig-button-hover disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
