import type { SnapKind, SnapStatus } from '@/lib/snaps'

const COLOR: Record<SnapKind, string> = { PHOTO: 'var(--sc-red)', TEXT: 'var(--sc-purple)' }

/**
 * Snapchat's status glyphs: squares for received snaps, arrows for sent ones.
 * Filled = not opened yet (New Snap / Delivered), outline = opened (Received / Opened).
 * Red = photo Snap, purple = text Snap.
 */
export function SnapStatusIcon({ status, kind }: { status: SnapStatus; kind: SnapKind }) {
  const color = COLOR[kind]
  const filled = status === 'NEW_SNAP' || status === 'DELIVERED'
  const sent = status === 'DELIVERED' || status === 'OPENED'
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      {sent ? (
        <path
          d="M2.5 2.5 14 8 2.5 13.5 5 8Z"
          fill={filled ? color : 'none'}
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ) : (
        <rect x="2" y="2" width="12" height="12" rx="2" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8" />
      )}
    </svg>
  )
}
