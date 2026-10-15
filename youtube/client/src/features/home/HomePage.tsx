import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'
import { CATEGORIES } from '@/lib/constants'
import { useState } from 'react'

export function HomePage() {
  const token = useAuthStore((s) => s.accessToken)
  const [category, setCategory] = useState('All')
  const { data } = useQuery({
    queryKey: ['home', category],
    queryFn: () =>
      api<VideoCardData[]>(
        category === 'All' ? '/videos' : `/videos?category=${category}`,
        token ? { headers: authHeaders(token) } : undefined,
      ),
  })
  const { data: home } = useQuery({
    queryKey: ['feed-home'],
    queryFn: () => api<{ items: VideoCardData[] }>('/feed/home', { headers: authHeaders(token!) }),
    enabled: !!token,
  })
  const videos = home?.items?.length ? home.items : data ?? []
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm ${category === c ? 'bg-white text-black' : 'bg-yt-surface hover:bg-yt-hover'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  )
}
