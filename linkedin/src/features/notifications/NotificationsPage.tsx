import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api<{ items: { id: string; title: string; body: string; read: boolean; createdAt: string; link?: string }[]; unread: number }>(
        '/notifications',
        { headers: authHeaders() },
      ),
  })

  const markAll = useMutation({
    mutationFn: () =>
      api('/notifications/read-all', { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api(`/notifications/${id}/read`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const grouped = {
    today: data?.items.filter((n) => new Date(n.createdAt) >= today) ?? [],
    earlier: data?.items.filter((n) => new Date(n.createdAt) < today) ?? [],
  }

  return (
    <div className="max-w-[600px] space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {data && data.unread > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>
            Mark all as read
          </Button>
        )}
      </div>
      {isLoading && <Spinner />}
      {(['today', 'earlier'] as const).map((section) =>
        grouped[section].length > 0 ? (
          <div key={section}>
            <h2 className="text-sm font-semibold text-linkedin-muted mb-2 capitalize">
              {section === 'today' ? 'Today' : 'Earlier'}
            </h2>
            <div className="space-y-1">
              {grouped[section].map((n) => (
                <Card
                  key={n.id}
                  className={cn(
                    'flex gap-3 cursor-pointer hover:bg-gray-50',
                    !n.read && 'bg-blue-50/50',
                  )}
                  padding
                >
                  <Link
                    to={n.link ?? '#'}
                    className="flex-1"
                    onClick={() => !n.read && markRead.mutate(n.id)}
                  >
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-sm text-linkedin-muted">{n.body}</p>
                    <p className="text-xs text-linkedin-muted mt-1">
                      {formatRelative(n.createdAt)}
                    </p>
                  </Link>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-linkedin-primary shrink-0 mt-2" />
                  )}
                </Card>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  )
}
