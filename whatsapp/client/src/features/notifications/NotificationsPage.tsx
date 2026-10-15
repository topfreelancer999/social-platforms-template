import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { rel } from '@/lib/format'

export function NotificationsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: { id: string; title: string; body: string; read: boolean; createdAt: string; link?: string }[]; unread: number }>('/notifications', { headers: authHeaders(token) }),
  })
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {data?.unread ? <Button variant="secondary" onClick={() => markAll.mutate()}>Mark all read</Button> : null}
      </div>
      <Card className="p-0 divide-y">
        {data?.items.map((n) => (
          <Link key={n.id} to={n.link ?? '#'} className={`block p-4 hover:bg-[#f0f2f5] ${!n.read ? 'bg-[#e7f3ff]' : ''}`}>
            <p className="font-semibold text-sm">{n.title}</p>
            <p className="text-sm text-fb-muted">{n.body}</p>
            <p className="text-xs text-fb-muted mt-1">{rel(n.createdAt)}</p>
          </Link>
        ))}
      </Card>
    </div>
  )
}
