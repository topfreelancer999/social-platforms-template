import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, MessageSquare, Plus } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { ago } from '@/lib/format'
import type { ChatRow, OpenedSnap, SnapStatus } from '@/lib/snaps'
import { useAuthStore } from '@/stores/authStore'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { SnapStatusIcon } from '@/features/snaps/SnapStatusIcon'
import { SnapViewer } from '@/features/snaps/SnapViewer'

const STATUS_LABEL: Record<SnapStatus, string> = {
  NEW_SNAP: 'New Snap',
  RECEIVED: 'Received',
  DELIVERED: 'Delivered',
  OPENED: 'Opened',
}

export function ChatsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [viewing, setViewing] = useState<OpenedSnap | null>(null)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api<{ chats: ChatRow[] }>('/messages/inbox', { headers: authHeaders(token!) }),
    enabled: !!token,
    // Hourglass/expiry are computed by the server, so refresh periodically.
    refetchInterval: 60_000,
  })

  const open = useMutation({
    mutationFn: (snapId: string) =>
      api<{ snap: OpenedSnap }>(`/snaps/direct/${snapId}/open`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: (r) => setViewing(r.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  const onRow = (c: ChatRow) => {
    if (c.snap?.status === 'NEW_SNAP') open.mutate(c.snap.id)
    else if (c.threadId) navigate(`/chat/${c.threadId}`)
    else navigate(`/profile/${c.friend.username}`)
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white/10">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-bold">Chat</h1>
        <div className="flex items-center gap-4">
          <Link to="/snap/new" className="flex items-center gap-1 text-sm font-semibold text-[var(--sc-yellow)]">
            <Camera size={18} /> Send Snap
          </Link>
          <Link to="/search?tab=users" className="flex items-center gap-1 text-sm font-semibold text-white/70">
            <Plus size={18} /> Add
          </Link>
        </div>
      </header>

      {open.isError && (
        <p role="alert" className="border-b border-white/10 bg-red-500/15 px-4 py-2 text-sm text-red-200">
          {open.error.message}
        </p>
      )}

      {isLoading && (
        <ul aria-label="Loading chats" className="divide-y divide-white/10">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
              <div className="h-11 w-11 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="h-2.5 w-1/2 rounded bg-white/10" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div className="px-4 py-8 text-center text-sm">
          <p className="text-red-300">Couldn't load your chats: {error.message}</p>
          <button type="button" onClick={() => refetch()} className="mt-3 font-semibold text-[var(--sc-yellow)]">
            Try again
          </button>
        </div>
      )}

      {data && !data.chats.length && (
        <div className="px-4 py-10 text-center text-sm text-white/60">
          <p>No friends yet.</p>
          <Link to="/search?tab=users" className="mt-2 inline-block font-semibold text-[var(--sc-yellow)]">
            Find friends to Snap
          </Link>
        </div>
      )}

      {data && data.chats.length > 0 && (
        <ul className="divide-y divide-white/10">
          {data.chats.map((c) => (
            <li key={c.friend.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
              <Link to={`/profile/${c.friend.username}`} aria-label={`${c.friend.displayName}'s Friendship Profile`}>
                <img src={c.friend.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              </Link>
              <button
                type="button"
                onClick={() => onRow(c)}
                disabled={open.isPending && open.variables === c.snap?.id}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold">{c.friend.displayName}</span>
                  <StreakBadge streak={c.streak} />
                </span>
                <RowStatus chat={c} />
              </button>
              {c.unread > 0 && (
                <span className="rounded-full bg-[var(--sc-blue)] px-2 py-0.5 text-xs font-semibold">{c.unread}</span>
              )}
              <Link
                to={`/snap/new?to=${c.friend.id}`}
                aria-label={`Send a Snap to ${c.friend.displayName}`}
                className="p-1 text-white/50 hover:text-white"
              >
                <Camera size={20} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {viewing && <SnapViewer snap={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

/** Second line of a row: Snap status, or the latest chat message when that is newer. */
function RowStatus({ chat }: { chat: ChatRow }) {
  const { snap, lastMessage } = chat
  const showMessage =
    lastMessage && snap?.status !== 'NEW_SNAP' && (!snap || new Date(lastMessage.createdAt) > new Date(snap.at))

  if (showMessage) {
    return (
      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-white/60">
        <MessageSquare size={14} className="shrink-0 text-[var(--sc-blue)]" />
        <span className="truncate">
          {lastMessage.fromMe ? 'You: ' : ''}
          {lastMessage.content}
        </span>
        <span className="shrink-0">· {ago(lastMessage.createdAt)}</span>
      </span>
    )
  }
  if (!snap) return <span className="mt-0.5 block text-xs text-white/50">Tap to chat</span>

  const isNew = snap.status === 'NEW_SNAP'
  const color = snap.kind === 'TEXT' ? 'text-[var(--sc-purple)]' : 'text-[var(--sc-red)]'
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-white/60">
      <SnapStatusIcon status={snap.status} kind={snap.kind} />
      <span className={isNew ? `font-bold ${color}` : ''}>
        {isNew && snap.count > 1 ? `${snap.count} New Snaps` : STATUS_LABEL[snap.status]}
      </span>
      <span className="shrink-0">· {ago(snap.at)}</span>
      {chat.streak?.hourglass && chat.streak.visible && (
        <span className="truncate text-amber-300">· Streak ending soon</span>
      )}
    </span>
  )
}
