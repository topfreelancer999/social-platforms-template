import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Link } from 'react-router-dom'

export function FriendsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ friends: import('@/stores/authStore').User[]; incoming: { id: string; from: import('@/stores/authStore').User }[]; suggestions: import('@/stores/authStore').User[] }>('/friends', { headers: authHeaders(token) }),
  })
  const accept = useMutation({
    mutationFn: (id: string) => api(`/friends/requests/${id}/accept`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
  const connect = useMutation({
    mutationFn: (id: string) => api(`/friends/${id}/request`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Friends</h1>
      {data?.incoming?.length ? (
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Friend requests</h2>
          {data.incoming.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 py-2">
              <Avatar src={inv.from.avatarUrl} />
              <span className="flex-1 font-medium">{inv.from.firstName} {inv.from.lastName}</span>
              <Button className="text-sm px-3 py-1" onClick={() => accept.mutate(inv.id)}>Confirm</Button>
            </div>
          ))}
        </Card>
      ) : null}
      <Card className="p-4">
        <h2 className="font-semibold mb-2">People you may know</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {data?.suggestions?.map((u) => (
            <div key={u.id} className="flex items-center gap-2 p-2 border rounded-lg">
              <Avatar src={u.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{u.firstName} {u.lastName}</p>
                <Button className="mt-1 w-full" onClick={() => connect.mutate(u.id)}>Add Friend</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Your friends ({data?.friends?.length ?? 0})</h2>
        {data?.friends?.map((f) => (
          <Link key={f.id} to={`/profile/${f.username}`} className="flex items-center gap-2 p-2 hover:bg-[#f0f2f5] rounded-lg">
            <Avatar src={f.avatarUrl} /><span>{f.firstName} {f.lastName}</span>
          </Link>
        ))}
      </Card>
    </div>
  )
}
