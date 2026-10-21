import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import type { ThreadItem } from './types'

export function ForwardDialog({
  messageIds,
  onClose,
  onForwarded,
}: {
  messageIds: string[]
  onClose: () => void
  onForwarded: (threadIds: string[]) => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [hideSender, setHideSender] = useState(false)

  const threads = useQuery({
    queryKey: ['threads'],
    queryFn: () => api<ThreadItem[]>('/messages/threads', { headers: authHeaders(token) }),
    enabled: !!token,
  })

  const forward = useMutation({
    mutationFn: () =>
      api<{ forwarded: { threadId: string }[] }>('/messages/forward', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ messageIds, toThreadIds: picked, hideSender }),
      }),
    onSuccess: (res) => {
      for (const { threadId } of res.forwarded) qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      onForwarded(picked)
    },
  })

  const q = query.trim().toLowerCase()
  const visible = (threads.data ?? []).filter((t) => !q || t.title.toLowerCase().includes(q))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const count = messageIds.length

  return (
    <Modal labelledBy="forward-title" onClose={onClose}>
      <div className="flex max-h-[min(36rem,calc(100dvh-2rem))] flex-col">
        <div className="flex items-center gap-2 px-4 pt-4">
          <h2 id="forward-title" className="flex-1 text-lg font-semibold">
            Forward {count > 1 ? `${count} messages` : 'message'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[var(--tg-muted)] hover:bg-black/5">
            <X size={20} />
          </button>
        </div>
        <label className="mx-4 mt-3 flex items-center gap-2 rounded-full bg-[var(--tg-sidebar)] px-3 py-1.5">
          <Search size={16} className="text-[var(--tg-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>

        <div className="mt-2 min-h-32 flex-1 overflow-y-auto px-2">
          {threads.isLoading && <p className="p-4 text-center text-sm text-[var(--tg-muted)]">Loading chats…</p>}
          {threads.isError && (
            <div className="p-4 text-center text-sm">
              <p className="text-red-600">{threads.error.message}</p>
              <button type="button" onClick={() => threads.refetch()} className="mt-2 font-semibold text-[var(--tg-blue)]">
                Try again
              </button>
            </div>
          )}
          {threads.isSuccess && !visible.length && (
            <p className="p-4 text-center text-sm text-[var(--tg-muted)]">{q ? 'No chats found' : 'No chats yet'}</p>
          )}
          <ul>
            {visible.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={picked.includes(t.id)}
                    onChange={() => toggle(t.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--tg-blue)]"
                  />
                  <img src={t.avatarUrl || 'https://i.pravatar.cc/96'} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                  {t.isGroup && <span className="text-xs text-[var(--tg-muted)]">group</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-black/5 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideSender}
              onChange={(e) => setHideSender(e.target.checked)}
              className="h-4 w-4 accent-[var(--tg-blue)]"
            />
            Hide sender name
          </label>
          {forward.isError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {forward.error.message}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--tg-blue)] hover:bg-[var(--tg-blue)]/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!picked.length || forward.isPending}
              onClick={() => forward.mutate()}
              className="rounded-lg bg-[var(--tg-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--tg-blue-dark)] disabled:opacity-50"
            >
              {forward.isPending ? 'Forwarding…' : picked.length > 1 ? `Forward to ${picked.length} chats` : 'Forward'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
