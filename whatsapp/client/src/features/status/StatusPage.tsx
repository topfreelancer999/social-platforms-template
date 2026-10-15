import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SAMPLE_STATUS_IMAGE } from '@/lib/constants'
import { Button } from '@/components/ui/Button'

export function StatusPage() {
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['status'],
    queryFn: () =>
      api<{
        statuses: { user: { username: string; avatarUrl: string; displayName?: string; firstName: string }; updates: { id: string; text: string; imageUrl?: string }[] }[]
      }>('/status', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const add = useMutation({
    mutationFn: () =>
      api('/status', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ text: 'New update', imageUrl: SAMPLE_STATUS_IMAGE }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status'] }),
  })

  return (
    <div className="h-full flex flex-col bg-wa-header">
      <header className="h-14 px-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Status</h1>
        <Button onClick={() => add.mutate()} className="text-sm bg-wa-teal hover:bg-wa-teal-dark px-3 py-1">
          Add
        </Button>
      </header>
      {me && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-wa-border">
          <img src={me.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
          <div>
            <p className="font-medium">My status</p>
            <p className="text-sm text-wa-muted">Tap to add status update</p>
          </div>
        </div>
      )}
      <p className="px-4 py-2 text-sm text-wa-teal font-medium">Recent updates</p>
      <div className="flex-1 overflow-y-auto">
        {data?.statuses.map((s) => (
          <Link key={s.user.username} to={`/profile/${s.user.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-wa-border/40">
            <div className="p-0.5 rounded-full border-2 border-wa-teal">
              <img src={s.user.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
            </div>
            <div>
              <p className="font-medium">{s.user.displayName || s.user.firstName}</p>
              <p className="text-sm text-wa-muted truncate">{s.updates[0]?.text || 'Photo'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
