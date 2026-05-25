import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import type { Group, UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export function GroupDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () =>
      api<{ group: Group; members: UserPublic[]; posts: unknown[] }>(`/groups/${id}`),
  })

  const isMember = data?.group.memberIds.includes(user?.id ?? '')

  const toggle = useMutation({
    mutationFn: () =>
      api(`/groups/${id}/${isMember ? 'leave' : 'join'}`, {
        method: 'POST',
        headers: authHeaders(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', id] }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  if (!data) return <p>Group not found</p>

  const { group, members } = data

  return (
    <div className="max-w-[800px] space-y-4">
      <Card className="flex gap-4">
        <img src={group.imageUrl} alt="" className="w-20 h-20 rounded" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{group.name}</h1>
          <p className="text-sm text-linkedin-muted">{group.memberIds.length} members · {group.privacy}</p>
          <p className="text-sm mt-2">{group.description}</p>
        </div>
        <Button variant={isMember ? 'outline' : 'primary'} onClick={() => toggle.mutate()}>
          {isMember ? 'Leave' : 'Join'}
        </Button>
      </Card>
      <Card>
        <h2 className="font-semibold mb-3">Members</h2>
        <div className="grid grid-cols-2 gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex gap-2 items-center">
              <Avatar src={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size="sm" />
              <span className="text-sm">
                {m.firstName} {m.lastName}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
