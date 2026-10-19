import { Crown } from 'lucide-react'
import { STATUS_COLORS } from '@/lib/constants'
import { colorHex } from '@/lib/permissions'
import { displayName, memberColor, memberRoles, type Member, type ServerDetail } from './types'

type Group = { id: string; title: string; members: Member[] }

/**
 * Discord's grouping: online members sit under their highest *hoisted* role,
 * everyone else under "Online"; offline members are always grouped last.
 */
function groupMembers(server: ServerDetail): Group[] {
  const hoisted = server.roles.filter((r) => r.hoist && !r.isEveryone).sort((a, b) => b.position - a.position)
  const groups = new Map<string, Group>(hoisted.map((r) => [r.id, { id: r.id, title: r.name, members: [] }]))
  const online: Group = { id: 'online', title: 'Online', members: [] }
  const offline: Group = { id: 'offline', title: 'Offline', members: [] }
  for (const m of server.members) {
    if (m.user.status === 'offline') {
      offline.members.push(m)
      continue
    }
    const top = memberRoles(m, server.roles).find((r) => r.hoist)
    ;(top ? groups.get(top.id)! : online).members.push(m)
  }
  const byName = (a: Member, b: Member) => displayName(a.user).localeCompare(displayName(b.user))
  return [...groups.values(), online, offline]
    .filter((g) => g.members.length > 0)
    .map((g) => ({ ...g, members: g.members.sort(byName) }))
}

export function MemberList({
  server,
  onSelect,
}: {
  server: ServerDetail
  onSelect: (userId: string, anchor: DOMRect) => void
}) {
  const groups = groupMembers(server)
  return (
    <div className="flex-1 overflow-y-auto p-2 pt-0">
      {groups.map((g) => (
        <section key={g.id}>
          <h3 className="text-[11px] font-semibold text-dc-muted uppercase px-2 pt-5 pb-1 truncate">
            {g.title} — {g.members.length}
          </h3>
          {g.members.map((m) => {
            const color = memberColor(m, server.roles)
            const isOffline = m.user.status === 'offline'
            return (
              <button
                key={m.user.id}
                type="button"
                onClick={(e) => onSelect(m.user.id, e.currentTarget.getBoundingClientRect())}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-dc-hover text-sm text-left ${isOffline ? 'opacity-40 hover:opacity-100' : ''}`}
              >
                <span className="relative shrink-0">
                  <img src={m.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dc-sidebar ${STATUS_COLORS[m.user.status ?? 'online']}`} />
                </span>
                <span className="truncate font-medium" style={color ? { color: colorHex(color) } : undefined}>
                  {displayName(m.user)}
                </span>
                {m.user.id === server.ownerId && (
                  <Crown size={14} className="text-[#f0b232] shrink-0" aria-label="Server Owner" />
                )}
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
