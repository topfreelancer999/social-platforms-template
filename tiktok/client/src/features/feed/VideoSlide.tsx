import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Bookmark, Heart, MessageCircle, Music2, Play, Plus, Share2, Volume2, VolumeX } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { usePlayerStore } from '@/stores/playerStore'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { compactCount } from '@/lib/format'
import type { VideoItem } from './types'
import { soundLabel } from '@/features/sounds/types'
import { useFollowCreator, useRecordView, useShareVideo, useToggleBookmark, useToggleLike } from './useVideoFeed'

/** A video must play on screen this long before it counts as a view. */
const VIEW_AFTER_MS = 2000
const DOUBLE_TAP_MS = 250

function Caption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u)
  return (
    <p
      className={cn('text-sm mt-1.5 break-words cursor-pointer', !expanded && 'line-clamp-2')}
      onClick={() => setExpanded((e) => !e)}
    >
      {parts.map((part, i) =>
        part.startsWith('#') && part.length > 1 ? (
          <Link
            key={i}
            to={`/hashtag/${encodeURIComponent(part.slice(1))}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  )
}

function RailButton({
  label,
  count,
  onClick,
  children,
}: {
  label: string
  count?: number
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex flex-col items-center text-white">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 md:bg-white/10 transition-transform active:scale-90">
        {children}
      </span>
      {count !== undefined && <span className="text-xs font-semibold mt-1 drop-shadow">{compactCount(count)}</span>}
    </button>
  )
}

export function VideoSlide({ video, active, index }: { video: VideoItem; active: boolean; index?: number }) {
  const ref = useRef<HTMLVideoElement>(null)
  const tapTimer = useRef<number | null>(null)
  const viewed = useRef(false)
  const me = useAuthStore((s) => s.user)
  const muted = usePlayerStore((s) => s.muted)
  const toggleMuted = usePlayerStore((s) => s.toggleMuted)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const like = useToggleLike()
  const bookmark = useToggleBookmark()
  const share = useShareVideo()
  const follow = useFollowCreator()
  const { mutate: recordView } = useRecordView()

  // Autoplay the slide in view, pause + rewind the others.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      el.muted = usePlayerStore.getState().muted
      el.play().catch(() => {
        // Browsers block unmuted autoplay without a gesture: fall back to muted, then give up and show "play".
        if (!el.muted) {
          el.muted = true
          usePlayerStore.getState().setMuted(true)
          el.play().catch(() => setUserPaused(true))
        } else {
          setUserPaused(true)
        }
      })
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [active])

  useEffect(() => {
    if (ref.current) ref.current.muted = muted
  }, [muted])

  // Count a view once it has played on screen for ~2s.
  useEffect(() => {
    if (!active || !playing || viewed.current) return
    const t = window.setTimeout(() => {
      viewed.current = true
      recordView(video.id)
    }, VIEW_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [active, playing, video.id, recordView])

  useEffect(
    () => () => {
      if (tapTimer.current !== null) window.clearTimeout(tapTimer.current)
    },
    [],
  )

  const togglePlay = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1500)
  }

  // Single tap = play/pause, double tap = like (with a heart burst), like the TikTok app.
  const onSurfaceClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (tapTimer.current !== null) {
      window.clearTimeout(tapTimer.current)
      tapTimer.current = null
      const id = Date.now()
      setHearts((h) => [...h, { id, x, y }])
      window.setTimeout(() => setHearts((h) => h.filter((p) => p.id !== id)), 800)
      if (!video.liked) like.mutate(video)
      return
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null
      togglePlay()
    }, DOUBLE_TAP_MS)
  }

  const onShare = async () => {
    const url = `${window.location.origin}/video/${video.id}`
    const useNative = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches
    try {
      if (useNative) {
        await navigator.share({ title: `@${video.author.username} on TikTok`, text: video.caption, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') showToast('Could not share this video')
      return
    }
    share.mutate({ video, channel: useNative ? 'native' : 'copy_link' })
  }

  const isSelf = me?.id === video.author.id
  const canFollow = !isSelf && !video.author.following

  return (
    <section
      data-index={index}
      className={cn(
        'snap-item relative w-full h-[100dvh] bg-black shrink-0 flex justify-center overflow-hidden',
        !playing && 'tt-paused',
      )}
    >
      <div className="relative h-full w-full md:max-w-[calc(100dvh*9/16)]">
        <video
          ref={ref}
          src={video.videoUrl}
          poster={video.coverUrl}
          className="absolute inset-0 w-full h-full object-cover md:rounded-lg"
          loop
          playsInline
          muted
          preload={active ? 'auto' : 'metadata'}
          onPlay={() => {
            setPlaying(true)
            setUserPaused(false)
          }}
          onPause={() => {
            setPlaying(false)
            if (active) setUserPaused(true)
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget
            setProgress(el.duration ? el.currentTime / el.duration : 0)
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none md:rounded-lg" />

        {/* Tap surface: play/pause + double-tap like */}
        <div className="absolute inset-0 cursor-pointer select-none" onClick={onSurfaceClick}>
          {active && userPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Play size={72} className="text-white/80 tt-fade-scale" fill="currentColor" />
            </div>
          )}
          {hearts.map((h) => (
            <Heart
              key={h.id}
              size={96}
              fill="#fe2c55"
              className="absolute text-tt-primary pointer-events-none tt-heart-pop"
              style={{ left: h.x, top: h.y }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="absolute top-14 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {muted && <span>Tap to unmute</span>}
        </button>

        {/* Right action rail */}
        <div className="absolute right-2 md:-right-16 bottom-28 z-10 flex flex-col items-center gap-4">
          <div className="relative mb-2">
            <Link to={`/@${video.author.username}`} aria-label={`@${video.author.username} profile`}>
              <Avatar src={video.author.avatarUrl} name={video.author.firstName} size="lg" className="border-2 border-white" />
            </Link>
            {canFollow && (
              <button
                type="button"
                aria-label={`Follow @${video.author.username}`}
                onClick={() => follow.mutate(video.author.id)}
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-tt-primary text-white"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            )}
          </div>
          <RailButton label={video.liked ? 'Unlike' : 'Like'} count={video.likeCount} onClick={() => like.mutate(video)}>
            <Heart size={30} fill={video.liked ? '#fe2c55' : 'white'} className={video.liked ? 'text-tt-primary' : 'text-white'} />
          </RailButton>
          <Link to={`/video/${video.id}`} aria-label="Comments" className="flex flex-col items-center text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 md:bg-white/10">
              <MessageCircle size={30} fill="white" />
            </span>
            <span className="text-xs font-semibold mt-1 drop-shadow">{compactCount(video.commentCount)}</span>
          </Link>
          <RailButton
            label={video.bookmarked ? 'Remove from favorites' : 'Add to favorites'}
            count={video.bookmarkCount ?? 0}
            onClick={() => bookmark.mutate(video)}
          >
            <Bookmark size={28} fill={video.bookmarked ? '#facc15' : 'white'} className={video.bookmarked ? 'text-yellow-400' : 'text-white'} />
          </RailButton>
          <RailButton label="Share" count={video.shareCount ?? 0} onClick={onShare}>
            <Share2 size={28} />
          </RailButton>
          {video.sound && (
            <Link
              to={`/sound/${video.sound.id}`}
              aria-label={`Sound: ${soundLabel(video.sound)}`}
              title={soundLabel(video.sound)}
              className="tt-disc-spin mt-1 flex h-11 w-11 items-center justify-center rounded-full border-[6px] border-neutral-800 bg-neutral-900 overflow-hidden"
            >
              {video.sound.coverUrl ? (
                <img src={video.sound.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music2 size={16} className="text-white" />
              )}
            </Link>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute left-3 right-20 md:right-3 bottom-[76px] z-10 text-white drop-shadow">
          <Link to={`/@${video.author.username}`} className="font-bold text-base inline-flex items-center gap-1 hover:underline">
            @{video.author.username}
            {video.author.verified && <BadgeCheck size={16} className="text-tt-secondary" />}
          </Link>
          <Caption text={video.caption} />
          {video.sound && (
            <Link
              to={`/sound/${video.sound.id}`}
              className="mt-2 flex w-fit max-w-[70%] items-center gap-2 text-sm hover:underline"
            >
              <Music2 size={14} className="shrink-0" />
              {/* TikTok scrolls the sound name like a ticker; the text is doubled for a seamless loop. */}
              <span className="tt-marquee w-40 sm:w-48">
                <span className="tt-marquee-track">
                  <span className="pr-10">{soundLabel(video.sound)}</span>
                  <span className="pr-10" aria-hidden>
                    {soundLabel(video.sound)}
                  </span>
                </span>
              </span>
            </Link>
          )}
        </div>

        {/* Playback progress */}
        <div className="absolute left-0 right-0 bottom-[60px] z-10 h-0.5 bg-white/20 pointer-events-none">
          <div className="h-full bg-white" style={{ width: `${Math.round(progress * 1000) / 10}%` }} />
        </div>

        {toast && (
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/80 px-4 py-2 text-sm font-semibold">
            {toast}
          </div>
        )}
      </div>
    </section>
  )
}
