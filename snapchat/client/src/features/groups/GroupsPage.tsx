import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

export function GroupsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [name, setName] = useState('')
  const qc = useQueryClient()
  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ id: string; name: string; description: string; memberCount?: number; _count?: { members: number } }[]>('/groups', { headers: authHeaders(token) }),
  })
  const create = useMutation({
    mutationFn: () => api('/groups', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name, description: 'New group' }) }),
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['groups'] }) },
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Groups</h1>
      <Card className="p-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="flex-1" />
        <Button onClick={() => name && create.mutate()}>Create</Button>
      </Card>
      <div className="grid sm:grid-cols-2 gap-3">
        {groups?.map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`}>
            <Card className="p-4 hover:shadow-md transition">
              <img src={`https://picsum.photos/seed/${g.id}/80/80`} alt="" className="w-16 h-16 rounded-lg mb-2" />
              <p className="font-semibold">{g.name}</p>
              <p className="text-xs text-fb-muted line-clamp-2">{g.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
