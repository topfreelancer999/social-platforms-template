import { useState } from 'react'
import { Crown, Search } from 'lucide-react'
import { colorHex } from '@/lib/permissions'
import { RoleChips } from '@/features/server/RoleChips'
import { displayName, memberColor, type ServerDetail } from '@/features/server/types'

/** Server Settings → Members: searchable member table with inline role assignment. */
export function MembersSection({ server }: { server: ServerDetail }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const members = server.members.filter(
    (m) => !needle || displayName(m.user).toLowerCase().includes(needle) || m.user.username.toLowerCase().includes(needle),
  )
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Server Members</h1>
      <p className="text-sm text-dc-muted mb-4">{server.members.length} members · assign roles below your highest role.</p>
      <label className="flex items-center gap-2 rounded bg-dc-rail px-3 mb-4">
        <Search size={16} className="text-dc-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members"
          aria-label="Search members"
          className="flex-1 min-w-0 bg-transparent py-2 text-sm outline-none"
        />
      </label>
      {members.length === 0 && <p className="text-sm text-dc-muted py-8 text-center">No members match “{q}”.</p>}
      <ul className="divide-y divide-white/5">
        {members.map((m) => {
          const color = memberColor(m, server.roles)
          return (
            <li key={m.user.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-3">
              <div className="flex items-center gap-3 sm:w-52 shrink-0 min-w-0">
                <img src={m.user.avatarUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-1" style={color ? { color: colorHex(color) } : undefined}>
                    <span className="truncate">{displayName(m.user)}</span>
                    {m.user.id === server.ownerId && <Crown size={14} className="text-[#f0b232] shrink-0" aria-label="Server Owner" />}
                  </p>
                  <p className="text-xs text-dc-muted truncate">@{m.user.username}</p>
                </div>
              </div>
              <div className="flex-1 min-w-0 sm:pt-2">
                <RoleChips server={server} member={m} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
