import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function GroupDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['group', id],
    queryFn: () =>
      api<{
        group: { name: string; description: string; imageUrl: string }
        isMember: boolean
        threadId: string | null
      }>(`/groups/${id}`, { headers: authHeaders(token!) }),
    enabled: !!id && !!token,
  })
  const toggle = useMutation({
    mutationFn: () =>
      api(`/groups/${id}/${data?.isMember ? 'leave' : 'join'}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: '{}',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', id] }),
  })

  if (!data) return <p className="p-4 text-[var(--tg-muted)]">Loading…</p>

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-4">
      <Link to="/groups" className="text-sm text-[var(--tg-blue)]">
        ← Groups
      </Link>
      <img src={data.group.imageUrl} alt="" className="mt-4 h-20 w-20 rounded-full object-cover" />
      <h1 className="mt-3 text-2xl font-bold">{data.group.name}</h1>
      <p className="mt-1 text-[var(--tg-muted)]">{data.group.description}</p>
      <Button className="mt-4 rounded-full bg-[var(--tg-blue)] text-white" onClick={() => toggle.mutate()}>
        {data.isMember ? 'Leave group' : 'Join group'}
      </Button>
      {data.isMember && data.threadId && (
        <Link
          to={`/chat/${data.threadId}`}
          className="mt-4 block rounded-lg bg-[var(--tg-sidebar)] py-3 text-center font-semibold text-[var(--tg-blue)]"
        >
          Open group chat
        </Link>
      )}
    </div>
  )
}
