import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Group } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export function GroupsPage() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<Group[]>('/groups'),
  })

  return (
    <div className="max-w-[800px] space-y-4">
      <h1 className="text-2xl font-semibold">Groups</h1>
      {isLoading && <Spinner />}
      <div className="grid md:grid-cols-2 gap-2">
        {groups?.map((g) => (
          <Card key={g.id} className="flex gap-3">
            <img src={g.imageUrl} alt="" className="w-16 h-16 rounded object-cover" />
            <div>
              <Link to={`/groups/${g.id}`} className="font-semibold hover:underline">
                {g.name}
              </Link>
              <p className="text-xs text-linkedin-muted">{g.memberIds.length} members</p>
              <p className="text-sm text-linkedin-muted line-clamp-2 mt-1">{g.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
