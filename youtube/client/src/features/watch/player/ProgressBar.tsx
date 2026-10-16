import { useRef, useState } from 'react'
import { formatDuration } from '@/lib/format'

/** YouTube-style scrubber: thin bar that thickens on hover, buffered range, hover time, drag to seek. */
export function ProgressBar({ current, duration, buffered, onSeek }: {
  current: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)

  const timeAt = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration
  }
  const pct = (t: number) => (duration ? `${(t / duration) * 100}%` : '0%')
  const shown = drag ?? current

  return (
    <div
      ref={barRef}
      role="slider"
      tabIndex={-1}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatDuration(shown)} of ${formatDuration(duration)}`}
      className="group/bar relative h-4 flex items-center cursor-pointer touch-none"
      onPointerMove={(e) => {
        const t = timeAt(e.clientX)
        setHover(t)
        if (drag !== null) setDrag(t)
      }}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => {
        if (!duration) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(timeAt(e.clientX))
      }}
      onPointerUp={(e) => {
        if (drag === null) return
        onSeek(timeAt(e.clientX))
        setDrag(null)
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <div className="relative w-full h-[3px] group-hover/bar:h-[5px] transition-[height] bg-white/20">
        <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: pct(buffered) }} />
        {hover !== null && <div className="absolute inset-y-0 left-0 bg-white/50" style={{ width: pct(hover) }} />}
        <div className="absolute inset-y-0 left-0 bg-yt-red" style={{ width: pct(shown) }} />
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-yt-red transition-transform ${
            drag !== null ? 'scale-100' : 'scale-0 group-hover/bar:scale-100'
          }`}
          style={{ left: pct(shown) }}
        />
      </div>
      {hover !== null && duration > 0 && (
        <span
          className="absolute bottom-5 -translate-x-1/2 bg-black/80 text-xs font-medium px-1.5 py-0.5 rounded pointer-events-none"
          style={{ left: `clamp(20px, ${pct(hover)}, calc(100% - 20px))` }}
        >
          {formatDuration(hover)}
        </span>
      )}
    </div>
  )
}
