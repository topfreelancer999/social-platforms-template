import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function PlaylistsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ id: string; title: string; videoCount: number }[]>('/playlists', { headers: authHeaders(token!) }),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Playlists</h1>
      {data?.map((p) => (
        <Link key={p.id} to={`/playlists/${p.id}`} className="block p-4 bg-yt-surface rounded-xl mb-2 hover:bg-yt-hover">
          {p.title} <span className="text-yt-muted text-sm">({p.videoCount} videos)</span>
        </Link>
      ))}
    </div>
  )
}
