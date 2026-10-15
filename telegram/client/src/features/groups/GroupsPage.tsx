import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type GroupItem = {
  id: string
  name: string
  description: string
  imageUrl: string
  memberCount?: number
}

export function GroupsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<GroupItem[]>('/groups', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <ul>
      {(data ?? []).map((g) => (
        <li key={g.id}>
          <Link to={`/groups/${g.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/60">
            <img src={g.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            <div>
              <p className="font-semibold">{g.name}</p>
              <p className="text-sm text-[var(--tg-muted)] line-clamp-1">{g.description}</p>
              {g.memberCount != null && (
                <p className="text-xs text-[var(--tg-blue)]">{g.memberCount} members</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
