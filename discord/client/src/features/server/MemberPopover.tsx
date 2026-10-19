import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { colorHex } from '@/lib/permissions'
import { RoleChips } from './RoleChips'
import { displayName, memberColor, type ServerDetail } from './types'

const WIDTH = 300

/** Profile popout anchored next to the clicked member (centred on phones). */
export function MemberPopover({
  server,
  userId,
  anchor,
  onClose,
}: {
  server: ServerDetail
  userId: string
  anchor: DOMRect
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const member = server.members.find((m) => m.user.id === userId)
  if (!member) return null
  const color = memberColor(member, server.roles)

  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = vw < 640
  const left = narrow
    ? Math.max(16, (vw - WIDTH) / 2)
    : anchor.left > vw / 2
      ? anchor.left - WIDTH - 12
      : anchor.right + 12
  const top = narrow ? 80 : Math.min(Math.max(16, anchor.top - 40), vh - 380)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={`${displayName(member.user)} profile`}
        className="fixed z-50 rounded-lg bg-dc-channel shadow-2xl overflow-hidden"
        style={{ left, top, width: Math.min(WIDTH, vw - 32), maxHeight: vh - top - 16 }}
      >
        {/* Avatar overlaps the banner; it lives outside the scroll area so it is never clipped. */}
        <div className="h-14 relative" style={{ backgroundColor: colorHex(color ?? 0x5865f2) }}>
          <img src={member.user.avatarUrl} alt="" className="absolute left-4 top-4 w-20 h-20 rounded-full border-[6px] border-dc-channel" />
        </div>
        <div className="px-4 pb-4 pt-12 overflow-y-auto" style={{ maxHeight: vh - top - 72 }}>
          <div className="bg-dc-rail rounded-lg p-3 space-y-3">
            <div>
              <p className="font-bold text-lg flex items-center gap-1.5">
                <span className="truncate" style={color ? { color: colorHex(color) } : undefined}>
                  {displayName(member.user)}
                </span>
                {member.user.id === server.ownerId && <Crown size={16} className="text-[#f0b232] shrink-0" aria-label="Server Owner" />}
              </p>
              <p className="text-sm text-dc-muted">@{member.user.username}</p>
            </div>
            <div className="border-t border-white/5 pt-3">
              <p className="text-[11px] font-bold uppercase text-dc-muted mb-1.5">Roles</p>
              <RoleChips server={server} member={member} />
            </div>
            <Link to={`/users/${member.user.username}`} className="block text-sm text-[#00a8fc] hover:underline">
              View Full Profile
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
