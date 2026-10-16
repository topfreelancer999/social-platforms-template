import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ThumbsUp, ThumbsDown, Share2, Captions } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoCard, type VideoCardData } from '@/components/videos/VideoCard'
import { formatViewCount, rel } from '@/lib/format'
import { VideoPlayer } from './player/VideoPlayer'
import { SubtitlesDialog } from './SubtitlesDialog'
import type { CaptionTrack, PlayerPrefs } from './player/types'

type WatchData = {
  video: VideoCardData & { videoUrl: string; description: string; liked: boolean; likeCount: number }
  isOwner: boolean
  captions: CaptionTrack[]
  resumeAt: number
  player: PlayerPrefs
  comments: { id: string; content: string; user: { username: string; avatarUrl: string }; createdAt: string }[]
  related: VideoCardData[]
}

export function WatchPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const [subtitlesOpen, setSubtitlesOpen] = useState(false)
  /** Local overrides so player preferences apply instantly while they save in the background. */
  const [prefOverrides, setPrefOverrides] = useState<Partial<PlayerPrefs>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['watch', id],
    queryFn: () => api<WatchData>(`/videos/${id}`, { headers: authHeaders(token) }),
    enabled: !!token && !!id,
    // Don't refetch on focus: it would bump views and reset the resume point mid-video.
    refetchOnWindowFocus: false,
  })
  const subscribe = useMutation({
    mutationFn: (channelId: string) =>
      api(`/subscriptions/${channelId}`, { method: 'POST', headers: authHeaders(token) }),
  })
  const like = useMutation({
    mutationFn: () => api(`/videos/${id}/like`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watch', id] }),
  })
  const addComment = useMutation({
    mutationFn: () =>
      api(`/videos/${id}/comment`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ content: comment }) }),
    onSuccess: () => { setComment(''); qc.invalidateQueries({ queryKey: ['watch', id] }) },
  })
  const savePrefs = useMutation({
    mutationFn: (patch: Partial<PlayerPrefs>) =>
      api<PlayerPrefs>('/settings/player', { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(patch) }),
  })

  if (!token) return <p className="text-yt-muted">Sign in to watch videos.</p>
  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto">
        <div className="aspect-video bg-yt-surface rounded-xl animate-pulse" />
        <div className="h-6 w-2/3 bg-yt-surface rounded mt-4 animate-pulse" />
      </div>
    )
  }
  if (isError || !data) return <p className="text-yt-muted">This video isn't available.</p>

  const { video, comments, related, captions } = data
  const prefs = { ...data.player, ...prefOverrides }
  const theater = prefs.theaterMode
  const updatePrefs = (patch: Partial<PlayerPrefs>) => {
    setPrefOverrides((o) => ({ ...o, ...patch }))
    savePrefs.mutate(patch)
  }
  const saveProgress = (position: number, duration: number, opts?: { leaving?: boolean }) => {
    void api(`/videos/${video.id}/progress`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ position, duration }),
      keepalive: opts?.leaving,
    })
      .then(() => {
        if (!opts?.leaving) return
        // Refresh red "watched" bars on the pages the viewer goes back to.
        for (const key of ['feed-home', 'home', 'sub-feed', 'trending']) qc.invalidateQueries({ queryKey: [key] })
      })
      .catch(() => {})
  }

  // One grid for both layouts so the <video> element never remounts when toggling theater mode.
  return (
    <div
      className={`grid grid-cols-1 gap-x-6 gap-y-4 ${
        theater ? 'lg:grid-cols-[1fr_minmax(0,880px)_400px_1fr]' : 'max-w-[1280px] mx-auto lg:grid-cols-[minmax(0,1fr)_400px]'
      }`}
    >
      <div className={theater ? '-mx-4 -mt-4 bg-black lg:col-span-full' : 'lg:col-start-1 lg:row-start-1'}>
        <div
          className={theater ? 'w-full' : 'aspect-video rounded-xl overflow-hidden'}
          style={theater ? { height: 'min(56.25vw, calc(100vh - 169px))', minHeight: 240 } : undefined}
        >
          <VideoPlayer
            key={video.id}
            videoId={video.id}
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            captions={captions}
            startAt={data.resumeAt}
            speed={prefs.playbackSpeed}
            captionsLanguage={prefs.captionsLanguage}
            theater={theater}
            onSpeedChange={(playbackSpeed) => updatePrefs({ playbackSpeed })}
            onCaptionsChange={(captionsLanguage) => updatePrefs({ captionsLanguage })}
            onTheaterChange={(theaterMode) => updatePrefs({ theaterMode })}
            onSaveProgress={saveProgress}
          />
        </div>
      </div>

      <div className={`min-w-0 ${theater ? 'lg:col-start-2' : 'lg:col-start-1'}`}>
        <h1 className="text-xl font-semibold">{video.title}</h1>
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
            {video.channel.id && !data.isOwner && (
              <button
                type="button"
                onClick={() => subscribe.mutate(video.channel.id!)}
                className="ml-2 bg-white text-black font-medium px-4 py-2 rounded-full text-sm hover:bg-gray-200"
              >
                Subscribe
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => like.mutate()} className={`flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm ${video.liked ? 'text-white' : ''}`}>
              <ThumbsUp size={18} /> {video.likeCount}
            </button>
            <button type="button" className="flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm"><ThumbsDown size={18} /></button>
            <button type="button" className="flex items-center gap-2 bg-yt-surface px-4 py-2 rounded-full text-sm"><Share2 size={18} /> Share</button>
            {data.isOwner && (
              <button
                type="button"
                onClick={() => setSubtitlesOpen(true)}
                className="flex items-center gap-2 bg-yt-surface hover:bg-yt-hover px-4 py-2 rounded-full text-sm"
              >
                <Captions size={18} /> Subtitles
              </button>
            )}
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
              className="flex-1 min-w-0 bg-yt-surface rounded-full px-4 py-2 text-sm outline-none border border-transparent focus:border-yt-hover"
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

      <aside className={`w-full space-y-3 ${theater ? 'lg:col-start-3' : 'lg:col-start-2 lg:row-start-1 lg:row-span-2'}`}>
        <h3 className="text-sm font-semibold text-yt-muted">Up next</h3>
        {related.length === 0 && <p className="text-sm text-yt-muted">No more videos from this channel.</p>}
        {related.map((v) => (
          <VideoCard key={v.id} video={v} layout="row" />
        ))}
      </aside>

      {subtitlesOpen && (
        <SubtitlesDialog videoId={video.id} captions={captions} onClose={() => setSubtitlesOpen(false)} />
      )}
    </div>
  )
}
