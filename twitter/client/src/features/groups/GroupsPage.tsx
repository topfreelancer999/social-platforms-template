import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function GroupsPage() {
  const { accessToken: token } = useAuthStore()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api<{ id: string; name: string; description: string; memberCount: number }[]>('/communities', { headers: authHeaders(token) }),
  })
  const create = useMutation({
    mutationFn: () =>
      api('/communities', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'New Community', description: 'A place to connect' }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
  })
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Communities</h1>
        <Button className="rounded-full text-sm" onClick={() => create.mutate()}>Create</Button>
      </header>
      {data?.map((c) => (
        <Link key={c.id} to={`/communities/${c.id}`} className="block p-4 border-b border-x-border-light dark:border-x-border hover:bg-black/5 dark:hover:bg-white/5">
          <p className="font-bold">{c.name}</p>
          <p className="text-sm text-x-muted">{c.description}</p>
          <p className="text-xs text-x-muted mt-1">{c.memberCount} members</p>
        </Link>
      ))}
    </div>
  )
}
