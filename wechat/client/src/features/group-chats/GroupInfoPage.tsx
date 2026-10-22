import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Crown, Minus, Plus, QrCode } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from './PageHeader'
import {
  canManage,
  type GroupChat,
  useGroupChat,
  useLeaveGroup,
  useRemoveMember,
  useRenameGroup,
  useUpdateMySettings,
} from './api'

/** Chat Info for a group: member grid, name, QR code, notice, alias, mute and leave. */
export function GroupInfoPage() {
  const { threadId } = useParams()
  const { data, isLoading, isError, error } = useGroupChat(threadId)

  if (isLoading) return <p className="p-4 text-sm text-wx-muted">Loading…</p>
  if (isError || !data) {
    return (
      <div className="h-full flex flex-col bg-wx-bg">
        <PageHeader back="/" title="Chat Info" />
        <p className="p-4 text-sm text-red-500">{error?.message ?? 'Group chat not found'}</p>
      </div>
    )
  }
  return <GroupInfo group={data} />
}

function GroupInfo({ group }: { group: GroupChat }) {
  const me = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [removing, setRemoving] = useState(false)
  const rename = useRenameGroup(group.id)
  const updateMe = useUpdateMySettings(group.id)
  const remove = useRemoveMember(group.id)
  const leave = useLeaveGroup(group.id)
  const isOwner = group.me.role === 'OWNER'
  const error = rename.error ?? updateMe.error ?? remove.error ?? leave.error

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <PageHeader back={`/chat/${group.id}`} title={`Chat Info (${group.memberCount})`} />
      <div className="flex-1 overflow-y-auto pb-6">
        <section className="bg-wx-panel px-3 pt-4 pb-2 grid grid-cols-5 gap-x-2 gap-y-3">
          {group.members.map((m) => (
            <div key={m.id} className="relative flex flex-col items-center min-w-0">
              <Link to={`/profile/${m.username}`} className="relative">
                <img src={m.avatarUrl} alt="" className="w-12 h-12 rounded-md object-cover" />
                {m.role === 'OWNER' && (
                  <Crown size={14} className="absolute -bottom-1 -right-1 text-[#fa9d3b] bg-white rounded-full p-0.5" aria-label="Owner" />
                )}
              </Link>
              {removing && m.id !== me?.id && (
                <button
                  type="button"
                  aria-label={`Remove ${m.groupName}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${m.groupName} from the group chat?`)) remove.mutate(m.id)
                  }}
                  className="absolute -top-1.5 right-0 w-5 h-5 rounded-full bg-[#fa5151] text-white flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
              )}
              <span className="mt-1 text-[11px] text-wx-muted truncate w-full text-center">{m.groupName}</span>
              {m.role === 'ADMIN' && <span className="text-[9px] text-wx-green leading-none">Admin</span>}
            </div>
          ))}
          <Link to={`/group-chat/${group.id}/add`} className="flex flex-col items-center" aria-label="Add members">
            <span className="w-12 h-12 rounded-md border border-dashed border-[#b2b2b2] text-[#b2b2b2] flex items-center justify-center">
              <Plus size={22} />
            </span>
          </Link>
          {isOwner && (
            <button
              type="button"
              onClick={() => setRemoving((r) => !r)}
              className="flex flex-col items-center"
              aria-label="Remove members"
              aria-pressed={removing}
            >
              <span
                className={cn(
                  'w-12 h-12 rounded-md border border-dashed flex items-center justify-center',
                  removing ? 'border-[#fa5151] text-[#fa5151]' : 'border-[#b2b2b2] text-[#b2b2b2]',
                )}
              >
                <Minus size={22} />
              </span>
            </button>
          )}
        </section>
        {removing && <p className="bg-wx-panel px-4 pb-2 text-xs text-wx-muted">Tap the red badge to remove a member.</p>}
        {error && <p className="px-4 py-2 text-sm text-red-500">{error.message}</p>}

        <section className="mt-2 bg-wx-panel divide-y divide-wx-border">
          <EditRow
            label="Group Name"
            value={group.name ?? ''}
            placeholder="Not set"
            maxLength={30}
            saving={rename.isPending}
            onSave={(v) => rename.mutateAsync(v)}
          />
          <Row to={`/group-chat/${group.id}/qr`} label="Group QR Code" right={<QrCode size={18} className="text-wx-muted" />} />
          <Link to={`/group-chat/${group.id}/notice`} className="block px-4 py-3 hover:bg-wx-bg">
            <span className="flex items-center justify-between">
              <span>Group Notice</span>
              <ChevronRight size={18} className="text-[#b2b2b2]" />
            </span>
            <span className="block text-sm text-wx-muted mt-1 line-clamp-2">
              {group.announcement?.content ?? (canManage(group.me.role) ? 'Not set. Tap to post one.' : 'No notice yet')}
            </span>
          </Link>
          {isOwner && <Row to={`/group-chat/${group.id}/manage`} label="Manage Group" />}
        </section>

        <section className="mt-2 bg-wx-panel divide-y divide-wx-border">
          <EditRow
            label="My Alias in Group"
            value={group.me.alias}
            placeholder={me?.displayName || me?.firstName || 'Not set'}
            maxLength={20}
            saving={updateMe.isPending}
            onSave={(v) => updateMe.mutateAsync({ alias: v })}
          />
        </section>

        <section className="mt-2 bg-wx-panel">
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <span>Mute Notifications</span>
            <input
              type="checkbox"
              role="switch"
              checked={group.me.muted}
              disabled={updateMe.isPending}
              onChange={(e) => updateMe.mutate({ muted: e.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'w-12 h-7 rounded-full p-0.5 transition-colors peer-focus-visible:ring-2 ring-wx-green',
                group.me.muted ? 'bg-wx-green' : 'bg-[#e5e5e5]',
              )}
            >
              <span className={cn('block w-6 h-6 rounded-full bg-white shadow transition-transform', group.me.muted && 'translate-x-5')} />
            </span>
          </label>
        </section>

        <button
          type="button"
          disabled={leave.isPending}
          onClick={() => {
            if (window.confirm('Leave this group chat? You will no longer receive its messages.')) {
              leave.mutate(undefined, { onSuccess: () => navigate('/') })
            }
          }}
          className="w-full mt-2 bg-wx-panel text-[#fa5151] py-3 font-medium disabled:opacity-50"
        >
          {leave.isPending ? 'Leaving…' : 'Leave Group'}
        </button>
      </div>
    </div>
  )
}

function Row({ to, label, right }: { to: string; label: string; right?: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-3 hover:bg-wx-bg">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {right}
        <ChevronRight size={18} className="text-[#b2b2b2]" />
      </span>
    </Link>
  )
}

/** Settings row that turns into an inline input when tapped. */
function EditRow({
  label,
  value,
  placeholder,
  maxLength,
  saving,
  onSave,
}: {
  label: string
  value: string
  placeholder: string
  maxLength: number
  saving: boolean
  onSave: (value: string) => Promise<unknown>
}) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <button type="button" onClick={() => setDraft(value)} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-wx-bg text-left">
        <span className="shrink-0">{label}</span>
        <span className="flex items-center gap-1 min-w-0 text-wx-muted text-sm">
          <span className="truncate">{value || placeholder}</span>
          <ChevronRight size={18} className="text-[#b2b2b2] shrink-0" />
        </span>
      </button>
    )
  }
  return (
    <form
      className="px-4 py-2.5 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft.trim()).then(() => setDraft(null), () => {})
      }}
    >
      <span className="shrink-0 text-sm">{label}</span>
      <input
        autoFocus
        value={draft}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-wx-bg rounded px-2 py-1.5 text-sm outline-none"
      />
      <button type="button" onClick={() => setDraft(null)} className="text-sm text-wx-muted">Cancel</button>
      <button type="submit" disabled={saving} className="text-sm bg-wx-green text-white rounded px-2.5 py-1 disabled:opacity-50">
        {saving ? '…' : 'Save'}
      </button>
    </form>
  )
}
