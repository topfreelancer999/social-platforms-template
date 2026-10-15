import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function HomeRedirect() {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api<{ servers: { id: string; channels?: { id: string; name: string; type: string }[] }[] }>('/servers', {
      headers: authHeaders(token!),
    }),
    enabled: !!token,
  })
  if (isLoading) return <p className="text-dc-muted p-4">Loading...</p>
  const first = data?.servers[0]
  if (first) return <Navigate to={`/servers/${first.id}`} replace />
  return <Navigate to="/discover" replace />
}
