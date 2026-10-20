import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { api, ApiError, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type IgPost } from '@/features/feed/PostCard'

export function PostDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<{ post: IgPost }>(`/posts/${id}`, { headers: authHeaders(token!) }),
    enabled: !!id && !!token,
    // 403/404 are final answers, not flaky network errors.
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
  })
  if (error) {
    const isPrivate = error instanceof ApiError && error.status === 403
    return (
      <div className="flex flex-col items-center text-center py-16 px-4 gap-3">
        {isPrivate && (
          <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">
            <Lock size={28} />
          </div>
        )}
        <p className="font-semibold">{isPrivate ? 'This account is private' : "Sorry, this page isn't available."}</p>
        <p className="text-sm text-ig-muted max-w-xs">
          {isPrivate ? 'Follow to see their photos and videos.' : error.message}
        </p>
        <Link to="/" className="text-sm font-semibold text-ig-blue">Go back to Instagram</Link>
      </div>
    )
  }
  if (!data?.post) return <p className="text-center py-8 text-ig-muted">Loading...</p>
  return (
    <div className="max-w-[470px] mx-auto p-4">
      <Link to="/" className="text-sm text-ig-blue mb-4 inline-block">← Back</Link>
      <PostCard post={data.post} />
    </div>
  )
}
