import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Hash, Lock, LogOut, Megaphone, Menu, Send, Settings, Trash2, Users, Volume2 } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { cn } from '@/lib/cn'
import { P, colorHex, has } from '@/lib/permissions'
import { useServer, useServerRealtime } from '@/features/server/hooks'
import { MemberList } from '@/features/server/MemberList'
import { MemberPopover } from '@/features/server/MemberPopover'
import { displayName, memberColor, type Channel, type UserSummary } from '@/features/server/types'

type Msg = { id: string; content: string; createdAt: string; author: UserSummary }

const NO_SEND = 'You do not have permission to send messages in this channel.'

function channelIcon(c: Pick<Channel, 'type' | 'isPrivate'>) {
  const Icon = c.type === 'VOICE' ? Volume2 : c.type === 'ANNOUNCEMENT' ? Megaphone : Hash
  return (
    <span className="relative shrink-0 text-dc-muted">
      <Icon size={18} />
      {c.isPrivate && <Lock size={9} strokeWidth={3} className="absolute -top-0.5 -right-1 bg-dc-sidebar rounded-sm" />}
    </span>
  )
}

/** Gear/settings target for a channel, or null when the viewer can manage neither overview nor permissions. */
function channelSettingsPath(serverId: string, c: Channel) {
  if (has(c.permissions, P.MANAGE_CHANNELS)) return `/servers/${serverId}/channels/${c.id}/settings/overview`
  if (has(c.permissions, P.MANAGE_ROLES)) return `/servers/${serverId}/channels/${c.id}/settings/permissions`
  return null
}

export function AppPage() {
  const { serverId, channelId } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [drawer, setDrawer] = useState<'channels' | 'members' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [popover, setPopover] = useState<{ userId: string; anchor: DOMRect } | null>(null)

  useServerRealtime(serverId, channelId)
  const { data: server, error: serverError } = useServer(serverId)
  const visible = server?.channels ?? []
  const current = visible.find((c) => c.id === channelId)

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () =>
      api<{ channel: Channel; messages: Msg[]; myPermissions: string }>(`/channels/${channelId}/messages`, {
        headers: authHeaders(token),
      }),
    enabled: !!channelId && !!token && !!current,
  })

  // Land on #general, and bounce away from channels this member can no longer see.
  useEffect(() => {
    if (!serverId || !server) return
    if (channelId && server.channels.some((c) => c.id === channelId)) return
    const fallback = server.channels.find((c) => c.name === 'general' && c.type === 'TEXT')
      ?? server.channels.find((c) => c.type !== 'VOICE')
    if (fallback) navigate(`/servers/${serverId}/channels/${fallback.id}`, { replace: true })
  }, [serverId, channelId, server, navigate])

  const send = useMutation({
    mutationFn: (content: string) =>
      api(`/channels/${channelId}/messages`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['channel', channelId] })
    },
  })

  const remove = useMutation({
    mutationFn: (messageId: string) =>
      api(`/channels/${channelId}/messages/${messageId}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel', channelId] }),
  })

  const leave = useMutation({
    mutationFn: () => api(`/servers/${serverId}/leave`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      navigate('/', { replace: true })
    },
  })

  if (!serverId) return null
  if (serverError) {
    return <p className="p-6 text-dc-muted">{serverError.message}</p>
  }

  const channel = chatData?.channel ?? current
  const messages = chatData?.messages ?? []
  const isVoice = channel?.type === 'VOICE'
  const channelPerms = chatData?.myPermissions ?? current?.permissions
  const canSend = has(channelPerms, P.SEND_MESSAGES)
  const canManageMessages = has(channelPerms, P.MANAGE_MESSAGES)
  const canOpenServerSettings = !!server && (server.isOwner || has(server.myPermissions, P.MANAGE_ROLES) || has(server.myPermissions, P.MANAGE_GUILD))
  const currentSettings = current ? channelSettingsPath(serverId, current) : null
  const membersById = new Map(server?.members.map((m) => [m.user.id, m]))
  const openMember = (userId: string, anchor: DOMRect) => setPopover({ userId, anchor })

  const channelLink = (c: Channel) => {
    const settings = channelSettingsPath(serverId, c)
    const active = channelId === c.id
    return (
      <div key={c.id} className={cn('group flex items-center rounded hover:bg-dc-hover', active && 'bg-dc-hover')}>
        <Link
          to={`/servers/${serverId}/channels/${c.id}`}
          onClick={() => setDrawer(null)}
          className={cn('flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 text-dc-muted group-hover:text-dc-text', active && 'text-white')}
        >
          {channelIcon(c)}
          <span className="truncate">{c.name}</span>
        </Link>
        {settings && (
          <Link
            to={settings}
            aria-label={`Edit channel ${c.name}`}
            title="Edit Channel"
            className={cn('p-1 mr-1 text-dc-muted hover:text-white', active ? 'block' : 'hidden group-hover:block group-focus-within:block')}
          >
            <Settings size={14} />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full relative">
      {drawer && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setDrawer(null)} aria-hidden />}

      <aside
        className={cn(
          'w-60 bg-dc-sidebar flex-col shrink-0',
          drawer === 'channels' ? 'flex fixed inset-y-0 left-[72px] z-40 shadow-2xl md:static md:shadow-none' : 'hidden md:flex',
        )}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="w-full h-12 px-3 flex items-center justify-between border-b border-black/20 font-semibold hover:bg-dc-hover"
          >
            <span className="truncate">{server?.name ?? 'Server'}</span>
            <ChevronDown size={18} className={cn('text-dc-muted transition-transform', menuOpen && 'rotate-180')} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div role="menu" className="absolute left-2 right-2 top-14 z-20 rounded-md bg-[#111214] p-1.5 shadow-2xl text-sm">
                {canOpenServerSettings && (
                  <Link role="menuitem" to={`/servers/${serverId}/settings/roles`} className="flex items-center justify-between px-2 py-1.5 rounded text-dc-text hover:bg-dc-blurple hover:text-white">
                    Server Settings <Settings size={16} />
                  </Link>
                )}
                {canOpenServerSettings && (
                  <Link role="menuitem" to={`/servers/${serverId}/settings/members`} className="flex items-center justify-between px-2 py-1.5 rounded text-dc-text hover:bg-dc-blurple hover:text-white">
                    Members <Users size={16} />
                  </Link>
                )}
                {currentSettings && (
                  <Link role="menuitem" to={currentSettings} className="flex items-center justify-between px-2 py-1.5 rounded text-dc-text hover:bg-dc-blurple hover:text-white">
                    Edit #{current?.name} <Hash size={16} />
                  </Link>
                )}
                {!server?.isOwner && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => leave.mutate()}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[#f23f43] hover:bg-[#da373c] hover:text-white"
                  >
                    Leave Server <LogOut size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[11px] font-semibold text-dc-muted uppercase px-2 mb-1">Text Channels</p>
          {!server && <p className="px-2 text-sm text-dc-muted">Loading…</p>}
          {visible.filter((c) => c.type !== 'VOICE').map(channelLink)}
          {visible.some((c) => c.type === 'VOICE') && (
            <p className="text-[11px] font-semibold text-dc-muted uppercase px-2 mt-3 mb-1">Voice</p>
          )}
          {visible.filter((c) => c.type === 'VOICE').map(channelLink)}
          {server && visible.length === 0 && (
            <p className="px-2 text-sm text-dc-muted">You cannot see any channels in this server yet.</p>
          )}
        </div>
        {user && (
          <div className="p-2 bg-dc-channel flex items-center gap-2 text-sm">
            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.displayName || user.firstName}</p>
              <p className="text-xs text-dc-muted">Online</p>
            </div>
          </div>
        )}
      </aside>

      <section className="flex-1 flex flex-col min-w-0 bg-dc-bg">
        <header className="h-12 px-2 sm:px-4 flex items-center gap-2 border-b border-black/20 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setDrawer('channels')}
            aria-label="Open channel list"
            className="md:hidden p-1.5 -ml-1 text-dc-muted hover:text-white"
          >
            <Menu size={20} />
          </button>
          {channel && channelIcon({ type: channel.type, isPrivate: current?.isPrivate })}
          <span className="font-semibold truncate">{channel?.name ?? 'channel'}</span>
          {channel?.topic && <span className="text-dc-muted text-sm truncate hidden sm:inline">— {channel.topic}</span>}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {currentSettings && (
              <Link to={currentSettings} aria-label="Channel settings" title="Edit Channel" className="p-1.5 text-dc-muted hover:text-white">
                <Settings size={18} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setDrawer('members')}
              aria-label="Show member list"
              className="lg:hidden p-1.5 text-dc-muted hover:text-white"
            >
              <Users size={20} />
            </button>
          </div>
        </header>

        {isVoice ? (
          <div className="flex-1 flex flex-col items-center justify-center text-dc-muted">
            <Volume2 size={48} className="mb-4 opacity-50" />
            <p>Voice channel — connect (demo UI)</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatLoading && <p className="text-sm text-dc-muted">Loading messages…</p>}
              {!chatLoading && channel && messages.length === 0 && (
                <div className="pt-8">
                  <div className="w-16 h-16 rounded-full bg-dc-hover flex items-center justify-center mb-3"><Hash size={36} /></div>
                  <p className="text-2xl font-bold">Welcome to #{channel.name}!</p>
                  <p className="text-dc-muted">
                    {has(channelPerms, P.READ_MESSAGE_HISTORY) ? `This is the start of the #${channel.name} channel.` : 'You do not have permission to read the message history of this channel.'}
                  </p>
                </div>
              )}
              {messages.map((m) => {
                const color = memberColor(membersById.get(m.author.id), server?.roles ?? [])
                const canDelete = m.author.id === user?.id || canManageMessages
                return (
                  <div key={m.id} className="flex gap-3 sm:gap-4 hover:bg-dc-hover/30 -mx-2 px-2 py-1 rounded group relative">
                    <button type="button" className="shrink-0 self-start" onClick={(e) => openMember(m.author.id, e.currentTarget.getBoundingClientRect())}>
                      <img src={m.author.avatarUrl} alt="" className="w-10 h-10 rounded-full mt-0.5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm">
                        <button
                          type="button"
                          onClick={(e) => openMember(m.author.id, e.currentTarget.getBoundingClientRect())}
                          className="font-semibold hover:underline"
                          style={color ? { color: colorHex(color) } : undefined}
                        >
                          {displayName(m.author)}
                        </button>
                        <span className="text-dc-muted text-xs ml-2">{rel(m.createdAt)}</span>
                      </p>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label="Delete message"
                        title="Delete Message"
                        onClick={() => remove.mutate(m.id)}
                        className="absolute right-2 -top-2 p-1.5 rounded bg-dc-sidebar border border-black/30 text-[#f23f43] opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <form
              className="px-2 sm:px-4 pb-4 sm:pb-6"
              onSubmit={(e) => {
                e.preventDefault()
                if (canSend && text.trim()) send.mutate(text.trim())
              }}
            >
              {send.error && <p className="text-xs text-red-400 mb-1">{send.error.message}</p>}
              {canSend || !channel ? (
                <div className="flex items-center gap-2 bg-dc-input rounded-lg px-4">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Message #${channel?.name ?? 'general'}`}
                    maxLength={2000}
                    className="flex-1 min-w-0 bg-transparent py-3 outline-none text-sm"
                  />
                  <button type="submit" aria-label="Send message" className="text-dc-muted hover:text-white p-2" disabled={!text.trim() || send.isPending}>
                    <Send size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-dc-input/60 rounded-lg px-4 py-3 text-sm text-dc-muted cursor-not-allowed" aria-disabled>
                  <Lock size={16} className="shrink-0" />
                  <span>{NO_SEND}</span>
                </div>
              )}
            </form>
          </>
        )}
      </section>

      <aside
        className={cn(
          'w-60 bg-dc-sidebar flex-col shrink-0',
          drawer === 'members' ? 'flex fixed inset-y-0 right-0 z-40 shadow-2xl lg:static lg:shadow-none' : 'hidden lg:flex',
        )}
      >
        <div className="h-12 px-4 flex items-center border-b border-black/20 text-xs font-semibold text-dc-muted uppercase shrink-0">
          Members — {server?.members.length ?? 0}
        </div>
        {server ? <MemberList server={server} onSelect={openMember} /> : <p className="p-4 text-sm text-dc-muted">Loading…</p>}
      </aside>

      {popover && server && (
        <MemberPopover server={server} userId={popover.userId} anchor={popover.anchor} onClose={() => setPopover(null)} />
      )}
    </div>
  )
}
