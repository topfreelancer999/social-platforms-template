import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

export function FriendsPage() {
  const { accessToken: token } = useAuthStore()
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
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3">
        <h1 className="text-xl font-bold">Follows</h1>
      </header>
      <section className="p-4 border-b border-x-border-light dark:border-x-border">
        <h2 className="font-bold mb-3">Who to follow</h2>
        {data?.suggestions?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2">
            <Link to={`/profile/${u.username}`}><Avatar src={u.avatarUrl} /></Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${u.username}`} className="font-bold hover:underline">{u.firstName} {u.lastName}</Link>
              <p className="text-x-muted text-sm">@{u.username}</p>
            </div>
            <Button className="rounded-full text-sm" onClick={() => follow.mutate(u.id)}>Follow</Button>
          </div>
        ))}
      </section>
      <section className="p-4">
        <h2 className="font-bold mb-2">Following ({data?.following?.length ?? 0})</h2>
        {data?.following?.map((f) => (
          <Link key={f.id} to={`/profile/${f.username}`} className="flex gap-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2">
            <Avatar src={f.avatarUrl} />
            <span className="font-semibold">{f.firstName} {f.lastName}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
