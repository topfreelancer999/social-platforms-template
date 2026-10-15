import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { IgPost } from '@/features/feed/PostCard'

export function ReelsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['reels'],
    queryFn: () => api<{ reels: IgPost[] }>('/posts/reels', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div className="max-w-[470px] mx-auto snap-y snap-mandatory h-[calc(100vh-8rem)] overflow-y-auto">
      {data?.reels.map((r) => (
        <div key={r.id} className="snap-start h-full min-h-[70vh] relative flex items-center justify-center bg-black">
          <video
            src={r.videoUrl ?? undefined}
            poster={r.imageUrl ?? undefined}
            controls
            autoPlay
            muted
            loop
            className="max-h-full w-full object-contain"
          />
          <div className="absolute bottom-4 left-4 right-4 text-sm">
            <p className="font-semibold">@{r.author.username}</p>
            <p className="text-ig-muted">{r.caption}</p>
          </div>
        </div>
      ))}
      {!data?.reels.length && <p className="text-center text-ig-muted py-12">No reels yet</p>}
    </div>
  )
}
