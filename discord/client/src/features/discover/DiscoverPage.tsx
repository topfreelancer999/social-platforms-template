import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

type DiscoverServer = { id: string; name: string; description: string; iconUrl: string; memberCount: number }

export function DiscoverPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['discover'],
    queryFn: () => api<{ servers: DiscoverServer[] }>('/servers/discover', { headers: authHeaders(token!) }),
    enabled: !!token,
  })
  const join = useMutation({
    mutationFn: (id: string) => api(`/servers/${id}/join`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  })
  const create = useMutation({
    mutationFn: (name: string) =>
      api<{ server: { id: string } }>('/servers', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      window.location.href = `/servers/${res.server.id}`
    },
  })

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Discover servers</h1>
      <p className="text-dc-muted mb-6">Join communities or create your own server.</p>
      <Button
        onClick={() => {
          const name = prompt('Server name?')
          if (name) create.mutate(name)
        }}
        className="mb-6"
      >
        Create server
      </Button>
      <div className="space-y-3">
        {data?.servers.map((s) => (
          <div key={s.id} className="flex items-center gap-4 p-4 bg-dc-sidebar rounded-lg">
            <img src={s.iconUrl} alt="" className="w-14 h-14 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-dc-muted truncate">{s.description}</p>
              <p className="text-xs text-dc-muted mt-1">{s.memberCount} members</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => join.mutate(s.id)}>Join</Button>
              <Link to={`/servers/${s.id}`} className="text-dc-blurple text-sm font-semibold self-center">Open</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
