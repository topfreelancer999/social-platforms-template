import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Bookmark, Share2, Music2 } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'

export interface VideoItem {
  id: string
  videoUrl: string
  coverUrl: string
  caption: string
  author: { username: string; firstName: string; avatarUrl: string; verified?: boolean }
  sound?: { title: string; artist: string } | null
  likeCount: number
  commentCount: number
  liked: boolean
}

export function VideoSlide({ video, active }: { video: VideoItem; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [liked, setLiked] = useState(video.liked)
  const [likeCount, setLikeCount] = useState(video.likeCount)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [active])

  const like = useMutation({
    mutationFn: () => api<VideoItem>(`/videos/${video.id}/like`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: (data) => {
      setLiked(data.liked)
      setLikeCount(data.likeCount)
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  return (
    <section className="snap-item relative w-full h-[100dvh] bg-black shrink-0">
      <video
        ref={ref}
        src={video.videoUrl}
        poster={video.coverUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={!active}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <Link to={`/@${video.author.username}`}>
          <Avatar src={video.author.avatarUrl} className="border-2 border-white w-12 h-12" />
        </Link>
        <button type="button" onClick={() => like.mutate()} className="flex flex-col items-center">
          <Heart size={32} fill={liked ? '#fe2c55' : 'none'} className={liked ? 'text-tt-primary' : 'text-white'} />
          <span className="text-xs mt-1">{likeCount}</span>
        </button>
        <Link to={`/video/${video.id}`} className="flex flex-col items-center text-white">
          <MessageCircle size={32} />
          <span className="text-xs mt-1">{video.commentCount}</span>
        </Link>
        <button type="button" className="text-white"><Bookmark size={28} /></button>
        <button type="button" className="text-white"><Share2 size={28} /></button>
      </div>
      <div className="absolute left-3 right-20 bottom-24 z-10 text-white">
        <Link to={`/@${video.author.username}`} className="font-bold text-base flex items-center gap-1">
          @{video.author.username}
          {video.author.verified && <span className="text-tt-secondary text-xs">✓</span>}
        </Link>
        <p className="text-sm mt-2 line-clamp-2">{video.caption}</p>
        {video.sound && (
          <p className="flex items-center gap-2 text-xs mt-2 opacity-90">
            <Music2 size={14} />
            {video.sound.title} — {video.sound.artist}
          </p>
        )}
      </div>
    </section>
  )
}
