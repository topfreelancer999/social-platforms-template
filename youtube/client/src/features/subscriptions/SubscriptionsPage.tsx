import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'

export function SubscriptionsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data: subs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api<{ subscriptions: { id: string; username: string; channelName: string; avatarUrl: string }[]; suggestions: { id: string; username: string }[] }>('/subscriptions', { headers: authHeaders(token!) }),
  })
  const { data: feed } = useQuery({
    queryKey: ['sub-feed'],
    queryFn: () => api<{ items: VideoCardData[] }>('/feed/subscriptions', { headers: authHeaders(token!) }),
  })
  const follow = useMutation({
    mutationFn: (id: string) => api(`/subscriptions/${id}`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Subscriptions</h1>
      <div className="flex gap-3 overflow-x-auto mb-6 pb-2">
        {subs?.subscriptions?.map((c) => (
          <Link key={c.id} to={`/channel/${c.username}`} className="flex flex-col items-center shrink-0 w-16">
            <img src={c.avatarUrl} alt="" className="w-14 h-14 rounded-full" />
            <span className="text-xs mt-1 truncate w-full text-center">{c.channelName}</span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {feed?.items?.map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
      {subs?.suggestions?.length ? (
        <div className="mt-8">
          <h2 className="font-semibold mb-3">Recommended channels</h2>
          {subs.suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2">
              <span>@{u.username}</span>
              <button type="button" onClick={() => follow.mutate(u.id)} className="text-sm bg-yt-surface px-3 py-1 rounded-full hover:bg-yt-hover">Subscribe</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
