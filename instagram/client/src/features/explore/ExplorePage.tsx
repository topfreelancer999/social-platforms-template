import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type IgPost } from '@/features/feed/PostCard'

export function ExplorePage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data: grid } = useQuery({
    queryKey: ['explore-grid'],
    queryFn: () => api<{ posts: IgPost[] }>('/posts/explore', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <div className="hidden md:grid grid-cols-3 gap-1 p-1">
        {grid?.posts.filter((p) => p.imageUrl).map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="relative aspect-square group">
            <img src={p.imageUrl!} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white font-semibold text-sm">
              <span>♥ {p.likeCount}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="md:hidden max-w-[470px] mx-auto">
        {grid?.posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}
