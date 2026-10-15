import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'
import { formatViewCount } from '@/lib/format'

export function ChannelPage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['channel', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; channelName: string; bio: string; avatarUrl: string; coverUrl: string; verified?: boolean }
        isSubscribed: boolean
        isSelf: boolean
        subscriberCount: number
        videos: VideoCardData[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
  })
  const sub = useMutation({
    mutationFn: () => api(`/subscriptions/${data!.user.id}`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', username] }),
  })
  if (!data) return null
  const { user, videos, subscriberCount, isSubscribed, isSelf } = data
  return (
    <div>
      <div className="h-32 md:h-48 rounded-xl bg-cover bg-center mb-4" style={{ backgroundImage: `url(${user.coverUrl})` }} />
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <img src={user.avatarUrl} alt="" className="w-24 h-24 rounded-full -mt-12 border-4 border-yt-bg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {user.channelName}
            {user.verified && <span className="text-xs bg-yt-muted px-1 rounded">✓</span>}
          </h1>
          <p className="text-yt-muted text-sm">@{user.username} · {formatViewCount(subscriberCount)} subscribers</p>
          <p className="text-sm mt-2 max-w-2xl">{user.bio}</p>
        </div>
        {!isSelf && !isSubscribed && (
          <button type="button" onClick={() => sub.mutate()} className="bg-white text-black font-medium px-4 py-2 rounded-full text-sm">
            Subscribe
          </button>
        )}
        {isSelf && <Link to={`/channel/${username}/edit`} className="border border-yt-hover px-4 py-2 rounded-full text-sm">Customize channel</Link>}
      </div>
      <div className="flex gap-4 mt-6 border-b border-yt-surface text-sm">
        <span className="border-b-2 border-white pb-2 font-medium">Videos</span>
        <Link to="/channel-feed" className="text-yt-muted pb-2">Posts</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {videos.map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
    </div>
  )
}
