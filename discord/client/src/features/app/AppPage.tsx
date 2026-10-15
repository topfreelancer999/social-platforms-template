import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hash, Volume2, Megaphone, Send, Settings } from 'lucide-react'
import { io } from 'socket.io-client'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { STATUS_COLORS } from '@/lib/constants'

type Channel = { id: string; name: string; type: string; topic?: string }
type Msg = { id: string; content: string; createdAt: string; author: { id: string; username: string; displayName?: string; firstName: string; avatarUrl: string; status?: string } }

function channelIcon(type: string) {
  if (type === 'VOICE') return <Volume2 size={18} className="text-dc-muted shrink-0" />
  if (type === 'ANNOUNCEMENT') return <Megaphone size={18} className="text-dc-muted shrink-0" />
  return <Hash size={18} className="text-dc-muted shrink-0" />
}

export function AppPage() {
  const { serverId, channelId } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data: serverData } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () =>
      api<{
        server: {
          id: string
          name: string
          iconUrl: string
          channels: Channel[]
          members: { role: string; user: { id: string; username: string; displayName?: string; firstName: string; avatarUrl: string; status?: string } }[]
        }
      }>(`/servers/${serverId}`, { headers: authHeaders(token!) }),
    enabled: !!serverId && !!token,
  })

  const { data: chatData } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () =>
      api<{ channel: Channel; messages: Msg[] }>(`/channels/${channelId}/messages`, { headers: authHeaders(token!) }),
    enabled: !!channelId && !!token,
  })

  useEffect(() => {
    if (!serverId || !serverData?.server.channels.length) return
    if (!channelId) {
      const general = serverData.server.channels.find((c) => c.name === 'general' && c.type === 'TEXT')
        ?? serverData.server.channels.find((c) => c.type === 'TEXT')
      if (general) navigate(`/servers/${serverId}/channels/${general.id}`, { replace: true })
    }
  }, [serverId, channelId, serverData, navigate])

  useEffect(() => {
    if (!token || !channelId) return
    const socket = io('/', { auth: { token }, path: '/socket.io' })
    socket.emit('channel:join', channelId)
    socket.on('channel:message', () => {
      qc.invalidateQueries({ queryKey: ['channel', channelId] })
    })
    return () => { socket.disconnect() }
  }, [token, channelId, qc])

  const send = useMutation({
    mutationFn: (content: string) =>
      api(`/channels/${channelId}/messages`, {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['channel', channelId] })
    },
  })

  const server = serverData?.server
  const channel = chatData?.channel
  const messages = chatData?.messages ?? []
  const isVoice = channel?.type === 'VOICE'

  if (!serverId) return null

  return (
    <div className="flex h-full">
      <aside className="w-60 bg-dc-sidebar flex flex-col shrink-0">
        <div className="h-12 px-3 flex items-center justify-between border-b border-black/20 font-semibold hover:bg-dc-hover cursor-pointer">
          <span className="truncate">{server?.name ?? 'Server'}</span>
          <Settings size={16} className="text-dc-muted" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[11px] font-semibold text-dc-muted uppercase px-2 mb-1">Text Channels</p>
          {server?.channels.filter((c) => c.type !== 'VOICE').map((c) => (
            <Link
              key={c.id}
              to={`/servers/${serverId}/channels/${c.id}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-dc-muted hover:bg-dc-hover hover:text-dc-text ${channelId === c.id ? 'bg-dc-hover text-white' : ''}`}
            >
              {channelIcon(c.type)}
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
          <p className="text-[11px] font-semibold text-dc-muted uppercase px-2 mt-3 mb-1">Voice</p>
          {server?.channels.filter((c) => c.type === 'VOICE').map((c) => (
            <Link
              key={c.id}
              to={`/servers/${serverId}/channels/${c.id}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-dc-muted hover:bg-dc-hover ${channelId === c.id ? 'bg-dc-hover text-white' : ''}`}
            >
              {channelIcon(c.type)}
              <span>{c.name}</span>
            </Link>
          ))}
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
        <header className="h-12 px-4 flex items-center gap-2 border-b border-black/20 shadow-sm shrink-0">
          {channelIcon(channel?.type ?? 'TEXT')}
          <span className="font-semibold">{channel?.name ?? 'channel'}</span>
          {channel?.topic && <span className="text-dc-muted text-sm truncate hidden sm:inline">— {channel.topic}</span>}
        </header>

        {isVoice ? (
          <div className="flex-1 flex items-center justify-center text-dc-muted">
            <Volume2 size={48} className="mb-4 opacity-50" />
            <p>Voice channel — connect (demo UI)</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-4 hover:bg-dc-hover/30 -mx-2 px-2 py-1 rounded group">
                  <img src={m.author.avatarUrl} alt="" className="w-10 h-10 rounded-full mt-0.5" />
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold hover:underline">
                        {m.author.displayName || m.author.firstName}
                      </span>
                      <span className="text-dc-muted text-xs ml-2">{rel(m.createdAt)}</span>
                    </p>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="px-4 pb-6"
              onSubmit={(e) => {
                e.preventDefault()
                if (text.trim()) send.mutate(text.trim())
              }}
            >
              <div className="flex items-center gap-2 bg-dc-input rounded-lg px-4">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message #${channel?.name ?? 'general'}`}
                  className="flex-1 bg-transparent py-3 outline-none text-sm"
                />
                <button type="submit" className="text-dc-muted hover:text-white p-2" disabled={!text.trim()}>
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      <aside className="hidden lg:flex w-60 bg-dc-sidebar flex-col shrink-0">
        <div className="h-12 px-4 flex items-center border-b border-black/20 text-xs font-semibold text-dc-muted uppercase">
          Members — {server?.members.length ?? 0}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {server?.members.map((m) => (
            <Link
              key={m.user.id}
              to={`/users/${m.user.username}`}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-dc-hover text-sm"
            >
              <span className="relative">
                <img src={m.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dc-sidebar ${STATUS_COLORS[m.user.status ?? 'online']}`} />
              </span>
              <span className="truncate">{m.user.displayName || m.user.firstName}</span>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  )
}
