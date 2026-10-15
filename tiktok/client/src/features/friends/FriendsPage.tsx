import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { BottomNav } from '@/components/layout/BottomNav'

export function FriendsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['follows'],
    queryFn: () =>
      api<{
        following: import('@/stores/authStore').User[]
        followers: import('@/stores/authStore').User[]
        suggestions: import('@/stores/authStore').User[]
      }>('/follows', { headers: authHeaders(token) }),
  })
  const follow = useMutation({
    mutationFn: (id: string) => api(`/follows/${id}`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follows'] }),
  })
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20 px-4 pt-4">
      <h1 className="text-2xl font-bold mb-4">Friends & follows</h1>
      <h2 className="font-semibold mb-2">Suggested for you</h2>
      {data?.suggestions?.map((u) => (
        <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/10">
          <Link to={`/@${u.username}`}><Avatar src={u.avatarUrl} /></Link>
          <span className="flex-1">@{u.username}</span>
          <button type="button" onClick={() => follow.mutate(u.id)} className="bg-tt-primary px-4 py-1 rounded text-sm font-semibold">
            Follow
          </button>
        </div>
      ))}
      <h2 className="font-semibold mt-6 mb-2">Following ({data?.following?.length ?? 0})</h2>
      {data?.following?.map((f) => (
        <Link key={f.id} to={`/@${f.username}`} className="flex items-center gap-2 py-2">
          <Avatar src={f.avatarUrl} />
          <span>@{f.username}</span>
        </Link>
      ))}
      <BottomNav />
    </div>
  )
}
