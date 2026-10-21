import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { StreakBadge } from '@/components/ui/StreakBadge'
import type { Streak } from '@/lib/snaps'

export function FriendsPage() {
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.accessToken)
  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: () =>
      api<{ friends: { id: string; username: string; avatarUrl: string; displayName?: string; streak: Streak | null }[] }>('/friends', {
        headers: authHeaders(token!),
      }),
    enabled: !!token,
  })
  const { data: requests } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () =>
      api<{ requests: { id: string; username: string; avatarUrl: string }[] }>('/friends/requests', {
        headers: authHeaders(token!),
      }),
    enabled: !!token,
  })

  const accept = useMutation({
    mutationFn: (userId: string) =>
      api(`/friends/${userId}/accept`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
    },
  })

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Friends</h1>

      {(requests?.requests?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-[var(--sc-yellow)]">Friend requests</h2>
          <ul className="space-y-2">
            {requests!.requests.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl bg-white/10 p-3">
                <div className="flex items-center gap-2">
                  <Avatar src={u.avatarUrl} alt={u.username} size="sm" />
                  <span>@{u.username}</span>
                </div>
                <Button
                  className="bg-[var(--sc-yellow)] text-black text-sm px-3 py-1"
                  onClick={() => accept.mutate(u.id)}
                >
                  Accept
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-2">
        {(friends?.friends ?? []).map((f) => (
          <li key={f.id}>
            <Link to={`/profile/${f.username}`} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15">
              <Avatar src={f.avatarUrl} alt={f.username} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{f.displayName || f.username}</span>
                  <StreakBadge streak={f.streak} />
                </p>
                <p className="text-sm text-white/50">@{f.username}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
