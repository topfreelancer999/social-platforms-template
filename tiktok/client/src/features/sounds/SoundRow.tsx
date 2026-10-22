import { Link } from 'react-router-dom'
import { Music2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { compactCount } from '@/lib/format'
import type { Sound } from './types'

/** Square sound artwork with an optional preview play/pause overlay. */
export function SoundCover({
  sound,
  playing,
  onToggle,
  className,
}: {
  sound: Pick<Sound, 'coverUrl' | 'title'>
  playing?: boolean
  onToggle?: () => void
  className?: string
}) {
  const art = sound.coverUrl ? (
    <img src={sound.coverUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <Music2 size={22} className="text-white/70" />
  )
  if (!onToggle) {
    return (
      <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10', className)}>
        {art}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? `Pause ${sound.title}` : `Preview ${sound.title}`}
      className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10', className)}
    >
      {art}
      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
        {playing ? <Pause size={18} fill="white" className="text-white" /> : <Play size={18} fill="white" className="text-white" />}
      </span>
    </button>
  )
}

/** A sound in a list: artwork (tap to preview), name linking to the sound page, usage count, trailing action. */
export function SoundRow({
  sound,
  playing,
  failed,
  onTogglePreview,
  onNavigate,
  children,
}: {
  sound: Sound
  playing?: boolean
  failed?: boolean
  onTogglePreview?: () => void
  onNavigate?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <SoundCover sound={sound} playing={playing} onToggle={onTogglePreview} className="h-14 w-14" />
      <div className="min-w-0 flex-1">
        <Link to={`/sound/${sound.id}`} onClick={onNavigate} className="block truncate text-sm font-semibold hover:underline">
          {sound.title}
        </Link>
        <p className="truncate text-xs text-tt-muted">
          {sound.author ? `@${sound.author.username}` : sound.artist} · {compactCount(sound.videoCount)}{' '}
          {sound.videoCount === 1 ? 'video' : 'videos'}
        </p>
        {failed && <p className="text-xs text-tt-primary">Preview unavailable</p>}
      </div>
      {children}
    </div>
  )
}
