import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, Users } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { P, bits, channelPermissionGroups, colorHex, has } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { Toggle } from '@/components/discord/Toggle'
import { TriStateToggle, type TriState } from '@/components/discord/TriStateToggle'
import { UnsavedChangesBar } from '@/components/discord/UnsavedChangesBar'
import { displayName, type Channel, type Role, type UserSummary } from '@/features/server/types'

type Overwrite = { id: string; type: 'role' | 'member'; targetId: string; allow: string; deny: string }
type OverwritesResponse = {
  channel: Channel & { serverId: string }
  overwrites: Overwrite[]
  roles: Role[]
  members: { user: UserSummary; roleIds: string[] }[]
  myPermissions: string
  myHighest: number
  isOwner: boolean
}
type Target = { type: 'role' | 'member'; id: string }
type Draft = Target & { allow: bigint; deny: bigint }

const keyOf = (t: Target) => `${t.type}:${t.id}`

/**
 * Channel Settings → Permissions: a "Private Channel" shortcut plus Discord's
 * advanced view — pick a role/member, then ✗ / ⁄ / ✓ each permission.
 */
export function ChannelPermissionsSection({ channelId }: { channelId: string }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Target | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [picking, setPicking] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['overwrites', channelId],
    queryFn: () => api<OverwritesResponse>(`/channels/${channelId}/overwrites`, { headers: authHeaders(token) }),
    enabled: !!token,
  })

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['overwrites', channelId] }),
      qc.invalidateQueries({ queryKey: ['server'] }),
      qc.invalidateQueries({ queryKey: ['channel', channelId] }),
    ])

  const put = useMutation({
    mutationFn: (d: Draft) =>
      api(`/channels/${channelId}/overwrites`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ type: d.type, targetId: d.id, allow: d.allow.toString(), deny: d.deny.toString() }),
      }),
    onSuccess: async () => {
      await refresh()
      setDraft(null)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/channels/${channelId}/overwrites/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: async () => {
      await refresh()
      setDraft(null)
      setSelected(null)
    },
  })

  if (isLoading) return <p className="text-dc-muted">Loading permissions…</p>
  if (error || !data) {
    return (
      <div className="rounded-lg bg-dc-sidebar p-6 text-center">
        <p className="font-semibold mb-1">Couldn’t load channel permissions</p>
        <p className="text-sm text-dc-muted">{error?.message ?? 'Unknown error'}</p>
      </div>
    )
  }

  const everyone = data.roles.find((r) => r.isEveryone)!
  const rolesById = new Map(data.roles.map((r) => [r.id, r]))
  const membersById = new Map(data.members.map((m) => [m.user.id, m]))
  const findOw = (t: Target) => data.overwrites.find((o) => o.type === t.type && o.targetId === t.id)
  const myPerms = bits(data.myPermissions)
  const isAdmin = data.isOwner || has(myPerms, P.ADMINISTRATOR)
  const roleLocked = (r: Role) => !data.isOwner && !r.isEveryone && r.position >= data.myHighest
  const kind = data.channel.type === 'VOICE' ? 'voice' : 'text'

  // Listed targets: roles by hierarchy, @everyone, then members — plus an unsaved new target.
  const roleTargets = data.overwrites
    .filter((o) => o.type === 'role' && o.targetId !== everyone.id)
    .map((o) => rolesById.get(o.targetId)!)
    .sort((a, b) => b.position - a.position)
  const memberTargets = data.overwrites.filter((o) => o.type === 'member').map((o) => membersById.get(o.targetId)!)
  const current: Target = selected ?? { type: 'role', id: everyone.id }
  const pendingNew = draft && !findOw(draft) && draft.id !== everyone.id ? draft : null

  const saved = findOw(current)
  const values: Draft =
    draft && keyOf(draft) === keyOf(current)
      ? draft
      : { ...current, allow: bits(saved?.allow), deny: bits(saved?.deny) }
  const dirty = !!draft && (draft.allow !== bits(findOw(draft)?.allow) || draft.deny !== bits(findOw(draft)?.deny))
  const currentRole = current.type === 'role' ? rolesById.get(current.id) : undefined
  const currentLocked = !!currentRole && roleLocked(currentRole)

  const setState = (flag: bigint, state: TriState) => {
    const allow = state === 'allow' ? values.allow | flag : values.allow & ~flag
    const deny = state === 'deny' ? values.deny | flag : values.deny & ~flag
    setDraft({ ...current, allow, deny })
  }

  const everyoneOw = findOw({ type: 'role', id: everyone.id })
  const isPrivate = has(bits(everyoneOw?.deny), P.VIEW_CHANNEL)
  const togglePrivate = (on: boolean) => {
    const allow = bits(everyoneOw?.allow) & ~P.VIEW_CHANNEL
    const deny = on ? bits(everyoneOw?.deny) | P.VIEW_CHANNEL : bits(everyoneOw?.deny) & ~P.VIEW_CHANNEL
    put.mutate({ type: 'role', id: everyone.id, allow, deny })
  }

  const select = (t: Target) => {
    if (draft && keyOf(draft) !== keyOf(t)) setDraft(null)
    setSelected(t)
    setPicking(false)
  }

  const addableRoles = data.roles
    .filter((r) => !r.isEveryone && !findOw({ type: 'role', id: r.id }))
    .sort((a, b) => b.position - a.position)
  const addableMembers = data.members.filter((m) => !findOw({ type: 'member', id: m.user.id }))

  const label = (t: Target) =>
    t.type === 'role' ? rolesById.get(t.id)?.name ?? 'Unknown role' : displayName(membersById.get(t.id)?.user ?? { firstName: 'Unknown', id: '', username: '', avatarUrl: '' })

  const targetButton = (t: Target, content: React.ReactNode) => (
    <button
      key={keyOf(t)}
      type="button"
      onClick={() => select(t)}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left',
        keyOf(t) === keyOf(current) ? 'bg-dc-hover text-white' : 'text-dc-muted hover:bg-dc-hover/60 hover:text-dc-text',
      )}
    >
      {content}
    </button>
  )

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Channel Permissions</h1>
      <p className="text-sm text-dc-muted mb-5">Use permissions to customise who can do what in this channel.</p>

      <div className="rounded-lg bg-dc-sidebar p-4 flex items-start gap-4 mb-8">
        <Lock size={20} className="text-dc-muted shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">Private Channel</p>
          <p className="text-sm text-dc-muted">
            By making a channel private, only select members and roles will be able to view this channel.
          </p>
        </div>
        <Toggle
          label="Private Channel"
          checked={isPrivate}
          disabled={put.isPending || (!isAdmin && !has(myPerms, P.VIEW_CHANNEL))}
          onChange={togglePrivate}
        />
      </div>

      <h2 className="text-xs font-bold uppercase text-dc-muted mb-3">Advanced permissions</h2>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="md:w-48 shrink-0">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-xs font-bold uppercase text-dc-muted">Roles/Members</span>
            <button
              type="button"
              aria-label="Add role or member"
              aria-expanded={picking}
              onClick={() => setPicking((v) => !v)}
              className="p-1 rounded text-dc-muted hover:text-white hover:bg-dc-hover"
            >
              <Plus size={16} />
            </button>
          </div>
          {picking && (
            <div className="rounded-md bg-dc-rail p-1.5 mb-2 max-h-64 overflow-y-auto text-sm">
              {addableRoles.length > 0 && <p className="text-[11px] font-bold uppercase text-dc-muted px-2 py-1">Roles</p>}
              {addableRoles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={roleLocked(r)}
                  onClick={() => {
                    select({ type: 'role', id: r.id })
                    setDraft({ type: 'role', id: r.id, allow: 0n, deny: 0n })
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-blurple hover:text-white text-left disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorHex(r.color) }} />
                  <span className="truncate">{r.name}</span>
                </button>
              ))}
              {addableMembers.length > 0 && <p className="text-[11px] font-bold uppercase text-dc-muted px-2 py-1">Members</p>}
              {addableMembers.map((m) => (
                <button
                  key={m.user.id}
                  type="button"
                  onClick={() => {
                    select({ type: 'member', id: m.user.id })
                    setDraft({ type: 'member', id: m.user.id, allow: 0n, deny: 0n })
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-blurple hover:text-white text-left"
                >
                  <img src={m.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                  <span className="truncate">{displayName(m.user)}</span>
                </button>
              ))}
              {addableRoles.length === 0 && addableMembers.length === 0 && (
                <p className="px-2 py-1.5 text-dc-muted">Everyone already has an overwrite.</p>
              )}
            </div>
          )}
          <div className="max-h-56 md:max-h-none overflow-y-auto">
            {roleTargets.map((r) =>
              targetButton({ type: 'role', id: r.id }, (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorHex(r.color) }} />
                  <span className="truncate flex-1">{r.name}</span>
                  {roleLocked(r) && <Lock size={12} className="shrink-0" />}
                </>
              )),
            )}
            {pendingNew?.type === 'role' &&
              targetButton(pendingNew, (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorHex(rolesById.get(pendingNew.id)?.color ?? 0) }} />
                  <span className="truncate flex-1 italic">{label(pendingNew)}</span>
                </>
              ))}
            {targetButton({ type: 'role', id: everyone.id }, (
              <>
                <Users size={14} className="shrink-0" />
                <span className="truncate">@everyone</span>
              </>
            ))}
            {memberTargets.map((m) =>
              targetButton({ type: 'member', id: m.user.id }, (
                <>
                  <img src={m.user.avatarUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  <span className="truncate">{displayName(m.user)}</span>
                </>
              )),
            )}
            {pendingNew?.type === 'member' &&
              targetButton(pendingNew, (
                <>
                  <img src={membersById.get(pendingNew.id)?.user.avatarUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  <span className="truncate italic">{label(pendingNew)}</span>
                </>
              ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <p className="font-semibold truncate">
              {current.type === 'role' && current.id === everyone.id ? '@everyone' : label(current)}
              <span className="text-dc-muted font-normal text-sm"> · {current.type === 'role' ? 'role' : 'member'}</span>
            </p>
            {saved && !currentLocked && (
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate(saved.id)}
                className="text-sm text-[#f23f43] hover:underline shrink-0 disabled:opacity-50"
              >
                {current.id === everyone.id ? 'Reset to defaults' : 'Remove overwrite'}
              </button>
            )}
          </div>
          {currentLocked && (
            <p className="flex items-start gap-2 text-sm text-[#f0b232] mt-3">
              <Lock size={16} className="shrink-0 mt-0.5" />
              This role is higher than or equal to your highest role, so you cannot change its overwrites.
            </p>
          )}
          {remove.error && <p className="text-sm text-red-400 mt-2">{remove.error.message}</p>}
          {put.error && !dirty && <p className="text-sm text-red-400 mt-2">{put.error.message}</p>}
          {channelPermissionGroups(kind).map((g) => (
            <section key={g.title} className="mt-5">
              <h3 className="text-xs font-bold uppercase text-dc-muted mb-1">{g.title}</h3>
              {g.items.map((item) => {
                const flag = P[item.key]
                const state: TriState = has(values.allow, flag) ? 'allow' : has(values.deny, flag) ? 'deny' : 'inherit'
                const cannot = !isAdmin && !has(myPerms, flag)
                return (
                  <div key={item.key} className="flex items-start gap-3 py-3 border-b border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px]">{item.channelLabel ?? item.label}</p>
                      <p className="text-sm text-dc-muted">{item.description}</p>
                    </div>
                    <TriStateToggle
                      label={item.channelLabel ?? item.label}
                      value={state}
                      disabled={currentLocked || cannot}
                      onChange={(s) => setState(flag, s)}
                    />
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </div>

      {dirty && draft && (
        <UnsavedChangesBar
          onReset={() => {
            setDraft(null)
            put.reset()
          }}
          onSave={() => put.mutate(draft)}
          saving={put.isPending}
          error={put.error?.message}
        />
      )}
    </div>
  )
}
