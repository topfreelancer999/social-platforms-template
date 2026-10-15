import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function HashtagPage() {
  const { tag } = useParams()
  const { data } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: () => api<{ tag: string; videos: { id: string; caption: string; coverUrl: string }[] }>(`/trending/hashtag/${tag}`),
  })
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <Link to="/discover" className="text-sm text-tt-secondary">← Discover</Link>
      <h1 className="text-2xl font-bold mt-4">#{tag}</h1>
      <div className="grid grid-cols-3 gap-1 mt-4">
        {data?.videos?.map((v) => (
          <Link key={v.id} to={`/video/${v.id}`} className="aspect-[9/16] bg-white/10">
            <img src={v.coverUrl} alt="" className="w-full h-full object-cover" />
          </Link>
        ))}
      </div>
    </div>
  )
}
