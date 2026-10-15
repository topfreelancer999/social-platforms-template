import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function StoryViewPage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api<{ stories: { user: { username: string }; items: { imageUrl: string }[] }[] }>('/stories', {
      headers: authHeaders(token!),
    }),
    enabled: !!token,
  })
  const group = data?.stories.find((s) => s.user.username === username)
  const item = group?.items[0]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex items-center gap-2">
        <Link to="/" className="text-white text-sm">← Back</Link>
        <span className="text-white font-semibold">@{username}</span>
      </div>
      {item ? (
        <img src={item.imageUrl} alt="" className="flex-1 object-contain w-full" />
      ) : (
        <p className="text-center text-ig-muted m-auto">Story expired or not found</p>
      )}
    </div>
  )
}
