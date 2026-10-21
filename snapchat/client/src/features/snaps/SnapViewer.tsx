import { useEffect, useEffectEvent } from 'react'
import { X } from 'lucide-react'
import type { OpenedSnap } from '@/lib/snaps'
import { ago } from '@/lib/format'

const SNAP_SECONDS = 10

/** Full-screen, view-once Snap. Closes on tap or after SNAP_SECONDS. */
export function SnapViewer({ snap, onClose }: { snap: OpenedSnap; onClose: () => void }) {
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const t = setTimeout(() => close(), SNAP_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Snap from ${snap.sender.displayName || snap.sender.username}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div className="relative h-full max-h-[100dvh] w-full max-w-md overflow-hidden">
        {snap.kind === 'PHOTO' && snap.imageUrl ? (
          <img src={snap.imageUrl} alt="Snap" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-8"
            style={{ background: snap.color ?? 'var(--sc-purple)' }}
          >
            <p className="break-words text-center text-3xl font-bold leading-tight">{snap.text}</p>
          </div>
        )}
        <div className="sc-gradient pointer-events-none absolute inset-0" />
        <div className="absolute left-0 right-0 top-0 space-y-3 p-3">
          <div className="h-1 overflow-hidden rounded-full bg-white/30">
            <div className="snap-timer h-full bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <img src={snap.sender.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
            <p className="text-sm font-semibold">{snap.sender.displayName || snap.sender.username}</p>
            <p className="text-xs text-white/70">{ago(snap.createdAt)}</p>
            <button type="button" aria-label="Close Snap" className="ml-auto p-1" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>
        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">
          View once · tap to close
        </p>
      </div>
    </div>
  )
}
