import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function GroupDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api<{ group: { name: string; description: string }; isMember: boolean; posts: { content: string; author: { firstName: string } }[] }>(`/groups/${id}`, { headers: authHeaders(token) }),
  })
  const toggle = useMutation({
    mutationFn: () => api(`/groups/${id}/${data?.isMember ? 'leave' : 'join'}`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', id] }),
  })
  if (!data) return null
  return (
    <Card className="p-4">
      <h1 className="text-2xl font-bold">{data.group.name}</h1>
      <p className="text-fb-muted mt-1">{data.group.description}</p>
      <Button className="mt-3" onClick={() => toggle.mutate()}>{data.isMember ? 'Leave group' : 'Join group'}</Button>
      <h2 className="font-semibold mt-6 mb-2">Discussion</h2>
      {data.posts.map((p, i) => <p key={i} className="text-sm border-b py-2"><b>{p.author.firstName}</b>: {p.content}</p>)}
    </Card>
  )
}
