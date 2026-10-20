import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Heart } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { activityQueryKey, fetchActivity, type Activity } from './activity'

function FollowRequestsRow({ requests }: { requests: Activity['followRequests'] }) {
  const [first, second] = requests.preview
  const others = requests.count - 1
  return (
    <Link to="/notifications/requests" className="flex items-center gap-3 px-4 py-3 hover:bg-ig-hover border-b border-ig-border">
      <div className="relative w-11 h-11 shrink-0">
        {second ? (
          <>
            <img src={second.avatarUrl} alt="" className="absolute top-0 right-0 w-8 h-8 rounded-full object-cover" />
            <img src={first.avatarUrl} alt="" className="absolute bottom-0 left-0 w-8 h-8 rounded-full object-cover ring-2 ring-ig-bg" />
          </>
        ) : (
          <img src={first?.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Follow requests ({requests.count})</p>
        <p className="text-sm text-ig-muted truncate">
          {first?.username}
          {others > 0 && ` + ${others} ${others === 1 ? 'other' : 'others'}`}
        </p>
      </div>
      {requests.unread > 0 && <span className="w-2 h-2 rounded-full bg-ig-blue shrink-0" aria-label="New requests" />}
      <ChevronRight size={20} className="text-ig-muted shrink-0" />
    </Link>
  )
}

export function NotificationsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: activityQueryKey,
    queryFn: () => fetchActivity(token),
    enabled: !!token,
  })
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityQueryKey }),
  })

  return (
    <div className="max-w-[600px] mx-auto py-4">
      <div className="flex justify-between items-center px-4 mb-2">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {data?.unread ? (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-sm font-semibold text-ig-blue disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {isLoading && <p className="text-center text-ig-muted py-8">Loading...</p>}
      {isError && (
        <div className="text-center py-8">
          <p className="text-sm text-ig-muted">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-semibold text-ig-blue">Try again</button>
        </div>
      )}
      {data && (
        <>
          {data.followRequests.count > 0 && <FollowRequestsRow requests={data.followRequests} />}
          {data.items.length === 0 && (
            <div className="flex flex-col items-center text-center py-16 px-4 gap-2">
              <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">
                <Heart size={28} />
              </div>
              <p className="font-semibold">Activity on your posts</p>
              <p className="text-sm text-ig-muted">When someone likes or comments on one of your posts, you'll see it here.</p>
            </div>
          )}
          {data.items.map((n) => (
            <Link
              key={n.id}
              to={n.link ?? '#'}
              className={cn('flex items-center gap-3 px-4 py-3 hover:bg-ig-hover', !n.read && 'bg-ig-surface')}
            >
              {n.actor ? (
                <img src={n.actor.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-ig-elevated shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {n.body} <span className="text-ig-muted">{rel(n.createdAt)}</span>
                </p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-ig-blue shrink-0" aria-label="Unread" />}
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
