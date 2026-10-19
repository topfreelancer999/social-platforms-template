import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { P, PERMISSION_GROUPS, bits, has } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { Toggle } from '@/components/discord/Toggle'
import { UnsavedChangesBar } from '@/components/discord/UnsavedChangesBar'
import { canManageRole, displayName, type Role, type ServerDetail } from '@/features/server/types'
import { RoleColorPicker } from './RoleColorPicker'

type Values = Pick<Role, 'name' | 'color' | 'hoist' | 'mentionable' | 'permissions'>
type Tab = 'display' | 'permissions' | 'members'

const pick = (r: Role): Values => ({
  name: r.name,
  color: r.color,
  hoist: r.hoist,
  mentionable: r.mentionable,
  permissions: r.permissions,
})

const same = (a: Values, b: Values) =>
  a.name === b.name && a.color === b.color && a.hoist === b.hoist && a.mentionable === b.mentionable && bits(a.permissions) === bits(b.permissions)

/**
 * Edit one role: Display (name, colour, hoist, mentionable), Permissions
 * (grouped toggles) and Manage Members. Edits live in a local draft until saved.
 */
export function RoleEditor({ server, role, onDeleted }: { server: ServerDetail; role: Role; onDeleted: () => void }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('display')
  const [draft, setDraft] = useState<Values | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addUserId, setAddUserId] = useState('')

  const values = draft ?? pick(role)
  const dirty = !!draft && !same(draft, pick(role))
  const locked = !canManageRole(server, role)
  const isAdmin = server.isOwner || has(server.myPermissions, P.ADMINISTRATOR)
  const myPerms = bits(server.myPermissions)
  const activeTab: Tab = role.isEveryone ? 'permissions' : tab
  const update = (patch: Partial<Values>) => setDraft({ ...values, ...patch })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['server', server.id] })

  const save = useMutation({
    mutationFn: () =>
      api(`/servers/${server.id}/roles/${role.id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(role.isEveryone ? { permissions: values.permissions } : { ...values, name: values.name.trim() }),
      }),
    onSuccess: async () => {
      await invalidate()
      setDraft(null)
    },
  })

  const del = useMutation({
    mutationFn: () => api(`/servers/${server.id}/roles/${role.id}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: async () => {
      await invalidate()
      onDeleted()
    },
  })

  const assign = useMutation({
    mutationFn: ({ userId, add }: { userId: string; add: boolean }) =>
      api(`/servers/${server.id}/members/${userId}/roles/${role.id}`, {
        method: add ? 'PUT' : 'DELETE',
        headers: authHeaders(token),
      }),
    onSuccess: () => {
      setAddUserId('')
      invalidate()
    },
  })

  const withRole = server.members.filter((m) => m.roleIds.includes(role.id))
  const withoutRole = server.members.filter((m) => !m.roleIds.includes(role.id))
  const perms = bits(values.permissions)
  const tabs: { id: Tab; label: string }[] = role.isEveryone
    ? [{ id: 'permissions', label: 'Permissions' }]
    : [
        { id: 'display', label: 'Display' },
        { id: 'permissions', label: 'Permissions' },
        { id: 'members', label: `Manage Members (${withRole.length})` },
      ]

  return (
    <div className="min-w-0">
      <h2 className="text-xs font-bold uppercase text-dc-muted mb-3 truncate">Edit Role — {role.name}</h2>
      {locked && (
        <p className="flex items-start gap-2 text-sm bg-[#f0b232]/10 border border-[#f0b232]/40 text-[#f0b232] rounded px-3 py-2 mb-4">
          <Lock size={16} className="shrink-0 mt-0.5" />
          You cannot edit this role because it is higher than or equal to your highest role.
        </p>
      )}
      <div role="tablist" className="flex gap-4 sm:gap-6 border-b border-white/10 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'pb-3 text-sm sm:text-base whitespace-nowrap border-b-2 -mb-px',
              activeTab === t.id ? 'border-dc-blurple text-white' : 'border-transparent text-dc-muted hover:text-dc-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'display' && (
        <div className="space-y-6">
          <label className="block">
            <span className="text-xs font-bold uppercase text-dc-muted">Role name <span className="text-red-400">*</span></span>
            <input
              value={values.name}
              disabled={locked}
              maxLength={100}
              onChange={(e) => update({ name: e.target.value })}
              className="mt-2 w-full rounded bg-dc-rail px-3 py-2.5 outline-none focus:ring-2 focus:ring-dc-blurple disabled:opacity-50"
            />
          </label>
          <div>
            <p className="text-xs font-bold uppercase text-dc-muted">Role colour <span className="text-red-400">*</span></p>
            <p className="text-sm text-dc-muted mb-3">Members use the colour of the highest role they have on this list.</p>
            <RoleColorPicker value={values.color} onChange={(color) => update({ color })} disabled={locked} />
          </div>
          <div className="border-t border-white/10 pt-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="font-medium">Display role members separately from online members</p>
              </div>
              <Toggle label="Display role members separately" checked={values.hoist} disabled={locked} onChange={(hoist) => update({ hoist })} />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="font-medium">Allow anyone to @mention this role</p>
                <p className="text-sm text-dc-muted">Members with "Mention @everyone, @here, and All Roles" can always ping this role.</p>
              </div>
              <Toggle label="Allow anyone to mention this role" checked={values.mentionable} disabled={locked} onChange={(mentionable) => update({ mentionable })} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm text-dc-muted">
              {role.isEveryone ? 'These permissions apply to every member of the server.' : 'Toggle what members with this role can do.'}
            </p>
            <button
              type="button"
              disabled={locked}
              onClick={() => update({ permissions: (isAdmin ? 0n : perms & ~myPerms).toString() })}
              className="text-sm text-[#00a8fc] hover:underline disabled:opacity-40 shrink-0"
            >
              Clear permissions
            </button>
          </div>
          {PERMISSION_GROUPS.map((g) => (
            <section key={g.title} className="mt-6">
              <h3 className="text-xs font-bold uppercase text-dc-muted mb-1">{g.title}</h3>
              {g.items.map((item) => {
                const flag = P[item.key]
                const cannotGrant = !isAdmin && !has(myPerms, flag)
                return (
                  <div key={item.key} className="flex items-start gap-4 py-4 border-b border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-dc-muted">{item.description}</p>
                      {cannotGrant && !locked && <p className="text-xs text-dc-muted mt-1">You can only change permissions you have yourself.</p>}
                    </div>
                    <Toggle
                      label={item.label}
                      checked={has(perms, flag)}
                      disabled={locked || cannotGrant}
                      onChange={(on) => update({ permissions: (on ? perms | flag : perms & ~flag).toString() })}
                    />
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          {!locked && withoutRole.length > 0 && (
            <form
              className="flex gap-2 mb-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (addUserId) assign.mutate({ userId: addUserId, add: true })
              }}
            >
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                aria-label="Member to add"
                className="flex-1 min-w-0 rounded bg-dc-rail px-3 py-2 text-sm outline-none"
              >
                <option value="">Select a member…</option>
                {withoutRole.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {displayName(m.user)} (@{m.user.username})
                  </option>
                ))}
              </select>
              <button type="submit" disabled={!addUserId || assign.isPending} className="rounded bg-dc-blurple hover:bg-dc-blurple-hover px-4 text-sm font-medium disabled:opacity-50">
                Add Members
              </button>
            </form>
          )}
          {withRole.length === 0 && <p className="text-sm text-dc-muted py-6 text-center">No members have this role yet.</p>}
          <ul className="divide-y divide-white/5">
            {withRole.map((m) => (
              <li key={m.user.id} className="flex items-center gap-3 py-2">
                <img src={m.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName(m.user)}</p>
                  <p className="text-xs text-dc-muted truncate">@{m.user.username}</p>
                </div>
                {!locked && (
                  <button
                    type="button"
                    aria-label={`Remove ${displayName(m.user)} from role`}
                    onClick={() => assign.mutate({ userId: m.user.id, add: false })}
                    className="p-1.5 rounded-full text-dc-muted hover:text-white hover:bg-dc-hover"
                  >
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {assign.error && <p className="text-sm text-red-400 mt-2">{assign.error.message}</p>}
        </div>
      )}

      {!role.isEveryone && !locked && (
        <div className="mt-8 pt-5 border-t border-white/10">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm flex-1 min-w-[12rem]">Delete the role <strong>{role.name}</strong>? This cannot be undone.</p>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm px-3 py-1.5 hover:underline">Cancel</button>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate()}
                className="text-sm font-medium px-4 py-1.5 rounded bg-[#da373c] hover:bg-[#a12828] disabled:opacity-60"
              >
                Delete Role
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium px-4 py-1.5 rounded border border-[#da373c] text-[#f23f43] hover:bg-[#da373c] hover:text-white">
              Delete Role
            </button>
          )}
          {del.error && <p className="text-sm text-red-400 mt-2">{del.error.message}</p>}
        </div>
      )}

      {dirty && (
        <UnsavedChangesBar
          onReset={() => {
            setDraft(null)
            save.reset()
          }}
          onSave={() => {
            if (!values.name.trim()) return
            save.mutate()
          }}
          saving={save.isPending}
          error={!values.name.trim() ? 'Role name is required.' : save.error?.message}
        />
      )}
    </div>
  )
}
