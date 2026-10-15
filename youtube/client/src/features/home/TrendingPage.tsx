import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'

export function TrendingPage() {
  const { data } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api<VideoCardData[]>('/feed/trending'),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Trending</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
    </div>
  )
}
