import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ThumbsUp, ThumbsDown, Share2 } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'
import { formatViewCount, rel } from '@/lib/format'

export function WatchPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const { data } = useQuery({
    queryKey: ['watch', id],
    queryFn: () =>
      api<{
        video: VideoCardData & { description: string; liked: boolean; likeCount: number }
        comments: { id: string; content: string; user: { username: string; avatarUrl: string }; createdAt: string }[]
        related: VideoCardData[]
      }>(`/videos/${id}`, { headers: authHeaders(token!) }),
    enabled: !!token && !!id,
  })
  const subscribe = useMutation({
    mutationFn: (channelId: string) =>
      api(`/subscriptions/${channelId}`, { method: 'POST', headers: authHeaders(token!) }),
  })
  const like = useMutation({
    mutationFn: () => api(`/videos/${id}/like`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watch', id] }),
  })
  const addComment = useMutation({
    mutationFn: () =>
      api(`/videos/${id}/comment`, { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ content: comment }) }),
    onSuccess: () => { setComment(''); qc.invalidateQueries({ queryKey: ['watch', id] }) },
  })
  if (!data) return <p className="text-yt-muted">Sign in to watch videos.</p>
  const { video, comments, related } = data
  return (
    <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <video src={video.videoUrl} controls autoPlay className="w-full h-full" poster={video.thumbnailUrl} />
        </div>
        <h1 className="text-xl font-semibold mt-3">{video.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-3">
            <Link to={`/channel/${video.channel.username}`}>
              <img src={video.channel.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
            </Link>
            <div>
              <Link to={`/channel/${video.channel.username}`} className="font-semibold hover:text-white">
                {video.channel.channelName || video.channel.username}
              </Link>
              <p className="text-yt-muted text-xs">{formatViewCount(video.viewCount)} views</p>
            </div>
            {video.channel.id && (
              <button
                type="button"
                onClick={() => subscribe.mutate(video.channel.id!)}
                className="ml-2 bg-white text-black font-medium px-4 py-2 rounded-full text-sm hover:bg-gray-200"
              >
                Subscribe
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => like.mutate()} className={`flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm ${video.liked ? 'text-white' : ''}`}>
              <ThumbsUp size={18} /> {video.likeCount}
            </button>
            <button type="button" className="flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm"><ThumbsDown size={18} /></button>
            <button type="button" className="flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm"><Share2 size={18} /> Share</button>
          </div>
        </div>
        <p className="mt-4 text-sm whitespace-pre-wrap bg-yt-surface rounded-xl p-4">{video.description}</p>
        <div className="mt-6">
          <h2 className="font-semibold mb-3">{comments.length} Comments</h2>
          <div className="flex gap-3 mb-4">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-yt-surface rounded-full px-4 py-2 text-sm outline-none border border-transparent focus:border-yt-hover"
            />
            <button type="button" onClick={() => comment && addComment.mutate()} className="text-sm font-medium px-4">Comment</button>
          </div>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 mb-4">
              <img src={c.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-xs text-yt-muted">@{c.user.username} · {rel(c.createdAt)}</p>
                <p className="text-sm mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="w-full lg:w-[400px] shrink-0 space-y-3">
        <h3 className="text-sm font-semibold text-yt-muted">Up next</h3>
        {related.map((v) => (
          <VideoCard key={v.id} video={v} layout="row" />
        ))}
      </aside>
    </div>
  )
}
