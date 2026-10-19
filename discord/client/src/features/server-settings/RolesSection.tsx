import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, GripVertical, Lock, Plus, Users } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { P, colorHex, has } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { canManageRole, type Role, type ServerDetail } from '@/features/server/types'
import { RoleEditor } from './RoleEditor'

const HIERARCHY_ERROR = 'You can only move roles below your highest role.'

/** Server Settings → Roles: hierarchy list (drag or ↑/↓ to reorder), create, and the role editor. */
export function RolesSection({ server }: { server: ServerDetail }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  const canManage = server.isOwner || has(server.myPermissions, P.MANAGE_ROLES)
  const everyone = server.roles.find((r) => r.isEveryone)
  const serverOrder = server.roles.filter((r) => !r.isEveryone).sort((a, b) => b.position - a.position)

  const reorder = useMutation({
    mutationFn: (roleIds: string[]) =>
      api(`/servers/${server.id}/roles`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ roleIds }) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['server', server.id] }),
    onError: (e) => setMoveError(e.message),
  })

  const create = useMutation({
    mutationFn: () =>
      api<{ role: Role }>(`/servers/${server.id}/roles`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'new role' }),
      }),
    onSuccess: async ({ role }) => {
      await qc.invalidateQueries({ queryKey: ['server', server.id] })
      setSelectedId(role.id)
    },
  })

  // Show the requested order optimistically while the PATCH is in flight.
  const ordered =
    reorder.isPending && reorder.variables
      ? reorder.variables.map((id) => serverOrder.find((r) => r.id === id)!).filter(Boolean)
      : serverOrder

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ordered.length) return
    const next = [...ordered]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    if (!server.isOwner) {
      // Mirror the server rule: every role that changes slot must stay below your highest role.
      const bad = next.some((r, i) => {
        const pos = next.length - i
        return pos !== r.position && (r.position >= server.myHighest || pos >= server.myHighest)
      })
      if (bad) {
        setMoveError(HIERARCHY_ERROR)
        return
      }
    }
    setMoveError(null)
    reorder.mutate(next.map((r) => r.id))
  }

  const selected = server.roles.find((r) => r.id === selectedId)

  if (selected) {
    return (
      <div className="flex gap-6">
        <nav className="hidden lg:block w-44 shrink-0">
          <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-xs font-bold uppercase text-dc-muted hover:text-white mb-3">
            <ArrowLeft size={14} /> Back
          </button>
          {[...ordered, ...(everyone ? [everyone] : [])].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left',
                r.id === selected.id ? 'bg-dc-hover text-white' : 'text-dc-muted hover:bg-dc-hover/60 hover:text-dc-text',
              )}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorHex(r.color) }} />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => setSelectedId(null)} className="lg:hidden flex items-center gap-1 text-xs font-bold uppercase text-dc-muted hover:text-white mb-3">
            <ArrowLeft size={14} /> Back to roles
          </button>
          <RoleEditor key={selected.id} server={server} role={selected} onDeleted={() => setSelectedId(null)} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Roles</h1>
      <p className="text-sm text-dc-muted mb-5">Use roles to group your server members and assign permissions.</p>

      {everyone && (
        <button
          type="button"
          onClick={() => setSelectedId(everyone.id)}
          className="w-full flex items-center gap-3 rounded-lg bg-dc-sidebar hover:bg-dc-hover p-4 mb-6 text-left"
        >
          <span className="w-10 h-10 rounded-full bg-dc-hover flex items-center justify-center shrink-0"><Users size={20} /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold">Default Permissions</span>
            <span className="block text-sm text-dc-muted truncate">@everyone · applies to all server members</span>
          </span>
          <ChevronRight size={20} className="text-dc-muted shrink-0" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-3">
        <p className="text-sm text-dc-muted flex-1">Members use the colour of the highest role they have. Drag roles to reorder them.</p>
        {canManage && (
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="flex items-center gap-1 rounded bg-dc-blurple hover:bg-dc-blurple-hover px-4 py-2 text-sm font-medium shrink-0 disabled:opacity-60"
          >
            <Plus size={16} /> Create Role
          </button>
        )}
      </div>
      {create.error && <p className="text-sm text-red-400 mb-2">{create.error.message}</p>}
      {moveError && <p role="alert" className="text-sm text-red-400 mb-2">{moveError}</p>}

      <div className="flex text-xs font-bold uppercase text-dc-muted px-2 pb-2 border-b border-white/10">
        <span className="flex-1">Roles — {ordered.length}</span>
        <span className="w-16 text-right">Members</span>
        <span className="w-[68px]" />
      </div>
      {ordered.length === 0 && (
        <div className="text-center py-10 text-dc-muted">
          <p className="font-medium text-dc-text">No roles yet</p>
          <p className="text-sm">Create a role to organise members and grant permissions.</p>
        </div>
      )}
      <ul>
        {ordered.map((r, i) => {
          const manageable = canManageRole(server, r)
          const canMoveUp = manageable && i > 0 && canManageRole(server, ordered[i - 1])
          const canMoveDown = manageable && i < ordered.length - 1 && canManageRole(server, ordered[i + 1])
          return (
            <li
              key={r.id}
              draggable={manageable && !reorder.isPending}
              onDragStart={(e) => {
                setDragId(r.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                setOverId(r.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) move(ordered.findIndex((x) => x.id === dragId), i)
                setDragId(null)
                setOverId(null)
              }}
              className={cn(
                'flex items-center gap-2 px-1 py-2 border-b border-white/5 rounded hover:bg-dc-hover/40',
                overId === r.id && dragId !== r.id && 'border-t-2 border-t-dc-blurple',
                dragId === r.id && 'opacity-50',
              )}
            >
              <span className={cn('text-dc-muted shrink-0', manageable ? 'cursor-grab' : 'opacity-0')} aria-hidden>
                <GripVertical size={16} />
              </span>
              <button type="button" onClick={() => setSelectedId(r.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: colorHex(r.color) }} />
                <span className="truncate font-medium" style={r.color ? { color: colorHex(r.color) } : undefined}>{r.name}</span>
                {!manageable && <Lock size={13} className="text-dc-muted shrink-0" aria-label="Locked" />}
              </button>
              <span className="w-16 text-right text-sm text-dc-muted flex items-center justify-end gap-1">
                {r.memberCount ?? 0} <Users size={14} />
              </span>
              <span className="w-[68px] flex justify-end">
                <button
                  type="button"
                  aria-label={`Move ${r.name} up`}
                  disabled={!canMoveUp || reorder.isPending}
                  onClick={() => move(i, i - 1)}
                  className="p-1 rounded text-dc-muted hover:text-white hover:bg-dc-hover disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${r.name} down`}
                  disabled={!canMoveDown || reorder.isPending}
                  onClick={() => move(i, i + 1)}
                  className="p-1 rounded text-dc-muted hover:text-white hover:bg-dc-hover disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  <ChevronDown size={16} />
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
