import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type IgPost } from '@/features/feed/PostCard'

export function PostDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<{ post: IgPost }>(`/posts/${id}`, { headers: authHeaders(token!) }),
    enabled: !!id && !!token,
  })
  if (!data?.post) return <p className="text-center py-8 text-ig-muted">Loading...</p>
  return (
    <div className="max-w-[470px] mx-auto p-4">
      <Link to="/" className="text-sm text-ig-blue mb-4 inline-block">← Back</Link>
      <PostCard post={data.post} />
    </div>
  )
}
