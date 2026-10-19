import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { colorHex } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { canManageRole, memberRoles, type Member, type ServerDetail } from './types'

/**
 * A member's roles as coloured chips. Roles the viewer may manage get a remove
 * button on the dot, and a "+" menu offers the assignable roles they lack.
 */
export function RoleChips({ server, member }: { server: ServerDetail; member: Member }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const roles = memberRoles(member, server.roles)
  const assignable = server.roles
    .filter((r) => !r.isEveryone && !member.roleIds.includes(r.id) && canManageRole(server, r))
    .sort((a, b) => b.position - a.position)

  const toggle = useMutation({
    mutationFn: ({ roleId, add }: { roleId: string; add: boolean }) =>
      api(`/servers/${server.id}/members/${member.user.id}/roles/${roleId}`, {
        method: add ? 'PUT' : 'DELETE',
        headers: authHeaders(token),
      }),
    onSuccess: () => {
      setAdding(false)
      qc.invalidateQueries({ queryKey: ['server', server.id] })
    },
  })

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {roles.map((r) => {
          const removable = canManageRole(server, r)
          return (
            <span key={r.id} className="group/chip inline-flex items-center gap-1 rounded bg-dc-input px-1.5 py-0.5 text-xs">
              {removable ? (
                <button
                  type="button"
                  aria-label={`Remove role ${r.name}`}
                  title="Remove role"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ roleId: r.id, add: false })}
                  className="w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colorHex(r.color) }}
                >
                  <X size={9} strokeWidth={4} className="text-black/70 opacity-0 group-hover/chip:opacity-100" />
                </button>
              ) : (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorHex(r.color) }} />
              )}
              {r.name}
            </span>
          )
        })}
        {assignable.length > 0 && (
          <button
            type="button"
            aria-label="Add role"
            aria-expanded={adding}
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center justify-center rounded bg-dc-input w-6 h-[22px] text-dc-muted hover:text-white"
          >
            <Plus size={14} />
          </button>
        )}
        {roles.length === 0 && assignable.length === 0 && <span className="text-xs text-dc-muted">No roles</span>}
      </div>
      {adding && (
        <div className="mt-2 rounded-md bg-dc-rail p-1.5 max-h-48 overflow-y-auto">
          {assignable.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ roleId: r.id, add: true })}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-dc-blurple hover:text-white text-left"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorHex(r.color) }} />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
      {toggle.error && <p className="text-xs text-red-400 mt-1">{toggle.error.message}</p>}
    </div>
  )
}
