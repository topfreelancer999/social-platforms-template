import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BellOff, Link2, MessageCirclePlus, Plus, Search, UserPlus } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { GroupAvatar } from '@/features/group-chats/GroupAvatar'
import { useChatSocket } from '@/features/group-chats/useChatSocket'

type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  memberAvatars: string[]
  isGroup: boolean
  unread: number
  muted: boolean
  /** Unread @mention: "ME" = [You were mentioned], "ALL" = [@All]. */
  mention: 'ME' | 'ALL' | null
  lastMessage?: { content: string; createdAt: string; senderId: string; type: string }
  updatedAt: string
}

const plusMenu = [
  { to: '/contacts/new', icon: MessageCirclePlus, label: 'New Chat' },
  { to: '/search', icon: UserPlus, label: 'Add Contacts' },
  { to: '/group-chat/join', icon: Link2, label: 'Join Group via Link' },
]

function preview(t: ThreadItem) {
  const last = t.lastMessage
  if (!last) return 'No messages yet'
  if (last.type === 'NOTICE') return `[Group Notice] ${last.content}`
  return last.content
}

export function ChatsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<ThreadItem[]>('/messages/threads', { headers: authHeaders(token!) }),
    enabled: !!token,
    refetchInterval: 10000,
  })
  useChatSocket()

  return (
    <div className="flex flex-col h-full bg-wx-panel">
      <header className="h-11 px-4 flex items-center justify-between bg-wx-header border-b border-wx-border shrink-0 relative">
        <h1 className="text-lg font-medium">WeChat</h1>
        <div className="flex gap-4 text-wx-text">
          <Link to="/search" aria-label="Search"><Search size={20} /></Link>
          <button type="button" aria-label="More" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Plus size={20} className="border border-current rounded-full" />
          </button>
        </div>
        {menuOpen && (
          <>
            <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-2 top-11 z-50 w-52 rounded-md bg-[#4c4c4c] text-white shadow-lg py-1">
              {plusMenu.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10">
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </header>
      <div className="px-3 py-2 bg-wx-header">
        <Link to="/search" className="block w-full bg-wx-panel rounded-md px-4 py-1.5 text-sm text-wx-muted text-center">
          Search
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-center text-wx-muted py-8 text-sm">Loading chats…</p>}
        {isError && (
          <p className="text-center text-sm py-8">
            <span className="text-red-500">Could not load chats. </span>
            <button type="button" className="text-wx-green" onClick={() => refetch()}>Retry</button>
          </p>
        )}
        {data?.map((t) => (
          <Link
            key={t.id}
            to={`/chat/${t.id}`}
            className="flex items-center gap-3 px-3 py-3 hover:bg-wx-bg border-b border-wx-border"
          >
            <div className="relative shrink-0">
              {t.isGroup ? (
                <GroupAvatar avatars={t.memberAvatars} className="w-12 h-12" />
              ) : (
                <img
                  src={t.avatarUrl || 'https://i.pravatar.cc/96?u=group'}
                  alt=""
                  className="w-12 h-12 rounded-md object-cover"
                />
              )}
              {t.unread > 0 &&
                (t.muted ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fa5151]" />
                ) : (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#fa5151] text-white text-[11px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {t.unread > 99 ? '99+' : t.unread}
                  </span>
                ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="font-medium truncate">{t.title}</p>
                {t.lastMessage && (
                  <span className="text-xs text-wx-muted shrink-0 ml-2">{rel(t.lastMessage.createdAt)}</span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-sm text-wx-muted truncate">
                  {t.mention && (
                    <span className="text-[#fa5151]">{t.mention === 'ME' ? '[You were mentioned] ' : '[@All] '}</span>
                  )}
                  {preview(t)}
                </p>
                {t.muted && <BellOff size={14} className="text-wx-muted shrink-0" aria-label="Muted" />}
              </div>
            </div>
          </Link>
        ))}
        {data && data.length === 0 && <p className="text-center text-wx-muted py-8 text-sm">No chats yet</p>}
      </div>
    </div>
  )
}
