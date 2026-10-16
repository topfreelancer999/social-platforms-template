import { useQuery } from '@tanstack/react-query'
import { CheckCheck, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { clock, receiptTime } from '@/lib/format'
import { MessageTicks } from './MessageTicks'
import type { MessageInfo } from './types'

type Recipient = MessageInfo['recipients'][number]

function Section({ title, icon, rows, time }: {
  title: string
  icon: React.ReactNode
  rows: Recipient[]
  time: (r: Recipient) => string | null
}) {
  if (!rows.length) return null
  return (
    <section className="bg-wa-header rounded-lg mb-3">
      <h3 className="flex items-center gap-2 px-4 pt-3 pb-2 text-sm text-wa-muted">
        {icon}
        {title}
      </h3>
      <ul>
        {rows.map((r) => {
          const t = time(r)
          return (
            <li key={r.user.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-wa-border/50">
              <img src={r.user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate">{r.user.displayName || `${r.user.firstName} ${r.user.lastName}`}</p>
                <p className="text-xs text-wa-muted">{t ? receiptTime(t) : '—'}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** "Message info": who has received and read one of your messages, and when. */
export function MessageInfoSheet({ messageId, isGroup, onClose }: {
  messageId: string
  isGroup: boolean
  onClose: () => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['message-info', messageId],
    queryFn: () => api<MessageInfo>(`/messages/${messageId}/info`, { headers: authHeaders(token) }),
    enabled: !!token,
  })

  const recipients = data?.recipients ?? []
  const read = recipients.filter((r) => r.readAt)
  const delivered = recipients.filter((r) => !r.readAt && r.deliveredAt)
  const waiting = recipients.filter((r) => !r.deliveredAt)

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Message info"
        className="w-full sm:w-[400px] h-full bg-wa-panel flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="h-14 px-4 flex items-center gap-4 bg-wa-header shrink-0">
          <button onClick={onClose} className="text-wa-muted hover:text-wa-text" aria-label="Close">
            <X size={22} />
          </button>
          <h2 className="font-medium">Message info</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <p className="text-sm text-wa-muted text-center py-8">Loading…</p>}
          {isError && <p className="text-sm text-red-400 text-center py-8">Couldn't load message info.</p>}
          {data && (
            <>
              <div className="flex justify-end mb-6">
                <div className="max-w-[85%] bg-wa-outgoing rounded-lg rounded-tr-none px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap break-words">{data.message.content}</p>
                  <p className="flex items-center justify-end gap-1 text-[11px] text-wa-muted mt-1">
                    {clock(data.message.createdAt)}
                    <MessageTicks status={data.message.status} />
                  </p>
                </div>
              </div>
              {isGroup ? (
                <>
                  <Section
                    title="Read by"
                    icon={<CheckCheck size={16} className="text-wa-tick-read" />}
                    rows={read}
                    time={(r) => r.readAt}
                  />
                  <Section
                    title="Delivered to"
                    icon={<CheckCheck size={16} />}
                    rows={delivered}
                    time={(r) => r.deliveredAt}
                  />
                  {waiting.length > 0 && (
                    <p className="text-xs text-wa-muted px-1">
                      {waiting.length} remaining
                    </p>
                  )}
                </>
              ) : (
                recipients.map((r) => (
                  <section key={r.user.id} className="bg-wa-header rounded-lg divide-y divide-wa-border/50">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CheckCheck size={18} className="text-wa-tick-read" />
                      <div>
                        <p className="text-sm">Read</p>
                        <p className="text-xs text-wa-muted">{r.readAt ? receiptTime(r.readAt) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CheckCheck size={18} className="text-wa-muted" />
                      <div>
                        <p className="text-sm">Delivered</p>
                        <p className="text-xs text-wa-muted">{r.deliveredAt ? receiptTime(r.deliveredAt) : '—'}</p>
                      </div>
                    </div>
                  </section>
                ))
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
