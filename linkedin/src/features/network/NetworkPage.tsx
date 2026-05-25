import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export function NetworkPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['network'],
    queryFn: () =>
      api<{
        invitations: { id: string; from: UserPublic; message?: string }[]
        connections: UserPublic[]
        suggestions: UserPublic[]
      }>('/network', { headers: authHeaders() }),
  })

  const accept = useMutation({
    mutationFn: (id: string) =>
      api(`/invitations/${id}/accept`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network'] }),
  })

  const ignore = useMutation({
    mutationFn: (id: string) =>
      api(`/invitations/${id}/ignore`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network'] }),
  })

  const connect = useMutation({
    mutationFn: (userId: string) =>
      api(`/users/${userId}/connect`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network'] }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />

  return (
    <div className="max-w-[800px] space-y-4">
      <h1 className="text-2xl font-semibold">My Network</h1>
      {data?.invitations && data.invitations.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Invitations ({data.invitations.length})</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {data.invitations.map((inv) => (
              <Card key={inv.id} className="flex gap-3">
                <Avatar
                  src={inv.from.avatarUrl}
                  name={`${inv.from.firstName} ${inv.from.lastName}`}
                />
                <div className="flex-1">
                  <Link
                    to={`/in/${inv.from.username}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {inv.from.firstName} {inv.from.lastName}
                  </Link>
                  <p className="text-xs text-linkedin-muted line-clamp-2">{inv.from.headline}</p>
                  {inv.message && <p className="text-xs mt-1">{inv.message}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => accept.mutate(inv.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => ignore.mutate(inv.id)}>
                      Ignore
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="font-semibold mb-2">People you may know</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.suggestions.map((u) => (
            <Card key={u.id} className="text-center">
              <Link to={`/in/${u.username}`}>
                <Avatar
                  src={u.avatarUrl}
                  name={`${u.firstName} ${u.lastName}`}
                  size="lg"
                  className="mx-auto"
                />
              </Link>
              <p className="font-semibold text-sm mt-2">
                {u.firstName} {u.lastName}
              </p>
              <p className="text-xs text-linkedin-muted line-clamp-2">{u.headline}</p>
              <Button size="sm" className="mt-3 w-full" onClick={() => connect.mutate(u.id)}>
                Connect
              </Button>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Your connections ({data?.connections.length})</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {data?.connections.map((u) => (
            <Card key={u.id} className="flex gap-3 items-center">
              <Link to={`/in/${u.username}`}>
                <Avatar src={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} />
              </Link>
              <div>
                <Link to={`/in/${u.username}`} className="font-semibold text-sm hover:underline">
                  {u.firstName} {u.lastName}
                </Link>
                <p className="text-xs text-linkedin-muted">{u.headline}</p>
              </div>
              <Link to="/messaging" className="ml-auto text-sm text-linkedin-primary font-semibold">
                Message
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
