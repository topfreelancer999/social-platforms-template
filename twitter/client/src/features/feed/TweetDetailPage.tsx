import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { TweetCard } from './TweetCard'

export function TweetDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['tweet', id],
    queryFn: () => api<{ tweet: unknown; replies: unknown[] }>(`/tweets/${id}`, { headers: authHeaders(token) }),
  })
  if (!data) return null
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3">
        <h1 className="text-xl font-bold">Post</h1>
      </header>
      <TweetCard tweet={data.tweet} />
      {data.replies.map((r) => (
        <TweetCard key={(r as { id: string }).id} tweet={r} />
      ))}
    </div>
  )
}
