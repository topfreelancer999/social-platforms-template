import { useRef } from 'react'
import { format } from 'date-fns'
import { Check, CheckCheck, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/cn'
import { senderName, snippet, type Msg } from './types'

const LONG_PRESS_MS = 450

export function MessageBubble({
  msg,
  mine,
  showSender,
  selecting,
  selected,
  highlighted,
  onOpenMenu,
  onToggleSelect,
  onJumpTo,
}: {
  msg: Msg
  mine: boolean
  showSender: boolean
  selecting: boolean
  selected: boolean
  highlighted: boolean
  onOpenMenu: (msg: Msg, x: number, y: number) => void
  onToggleSelect: (id: string) => void
  onJumpTo: (id: string) => void
}) {
  const pressTimer = useRef<number | undefined>(undefined)
  const cancelPress = () => window.clearTimeout(pressTimer.current)
  const created = new Date(msg.createdAt)

  return (
    <div
      id={`msg-${msg.id}`}
      className={cn(
        'group/msg -mx-3 flex items-center gap-2 px-3 py-0.5 transition-colors duration-700',
        mine ? 'justify-end' : 'justify-start',
        highlighted && 'bg-[var(--tg-blue)]/15 duration-150',
        selecting && 'cursor-pointer',
        selected && 'bg-[var(--tg-blue)]/10',
      )}
      onClick={selecting ? () => onToggleSelect(msg.id) : undefined}
    >
      {selecting && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(msg.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select message from ${senderName(msg.sender)}`}
          className={cn('h-5 w-5 shrink-0 accent-[var(--tg-blue)]', mine && 'order-first mr-auto')}
        />
      )}
      <div className={cn('relative min-w-0 max-w-[80%] md:max-w-[65%]', mine && 'order-last')}>
        <div
          onContextMenu={(e) => {
            if (selecting) return
            e.preventDefault()
            onOpenMenu(msg, e.clientX, e.clientY)
          }}
          onPointerDown={(e) => {
            if (selecting || e.pointerType !== 'touch') return
            const { clientX, clientY } = e
            pressTimer.current = window.setTimeout(() => onOpenMenu(msg, clientX, clientY), LONG_PRESS_MS)
          }}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerMove={cancelPress}
          className={cn(
            'rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap shadow-sm select-text',
            mine ? 'rounded-br-md bg-[var(--tg-bubble-out)]' : 'rounded-bl-md bg-[var(--tg-bubble-in)]',
            selected && 'ring-2 ring-[var(--tg-blue)]/50',
          )}
        >
          {showSender && !mine && (
            <p className="mb-0.5 text-xs font-semibold text-[var(--tg-blue)]">{senderName(msg.sender)}</p>
          )}
          {msg.forwardedFrom && (
            <p className="mb-0.5 text-xs text-[var(--tg-blue)]">
              Forwarded from <span className="font-semibold">{msg.forwardedFrom.name}</span>
            </p>
          )}
          {msg.replyTo ? (
            <button
              type="button"
              onClick={(e) => {
                if (selecting) return
                e.stopPropagation()
                onJumpTo(msg.replyTo!.id)
              }}
              className="mb-1 block w-full min-w-0 rounded-md border-l-[3px] border-[var(--tg-blue)] bg-[var(--tg-blue)]/10 px-2 py-0.5 text-left hover:bg-[var(--tg-blue)]/15"
              aria-label={`Reply to ${msg.replyTo.senderName}: ${snippet(msg.replyTo)}. Show original message`}
            >
              <span className="block truncate text-xs font-semibold text-[var(--tg-blue)]">{msg.replyTo.senderName}</span>
              <span className="block truncate text-xs text-[var(--tg-text)]/80">{snippet(msg.replyTo)}</span>
            </button>
          ) : (
            msg.replyToDeleted && (
              <div className="mb-1 rounded-md border-l-[3px] border-[var(--tg-muted)] bg-black/5 px-2 py-1 text-xs text-[var(--tg-muted)] italic">
                Deleted message
              </div>
            )
          )}
          {msg.type === 'PHOTO' && msg.mediaUrl && (
            <img src={msg.mediaUrl} alt="" className="mb-1 max-h-72 rounded-lg object-cover" />
          )}
          <span>{msg.content}</span>
          <span className="float-right mt-1.5 ml-2 flex translate-y-0.5 items-center gap-1 text-[11px] leading-none text-[var(--tg-muted)]">
            {msg.editedAt && (
              <span title={`Edited ${format(new Date(msg.editedAt), 'PPpp')}`}>edited</span>
            )}
            <time dateTime={msg.createdAt} title={format(created, 'PPpp')}>
              {format(created, 'HH:mm')}
            </time>
            {mine &&
              (msg.read ? (
                <CheckCheck size={14} className="text-[var(--tg-blue)]" aria-label="Read" />
              ) : (
                <Check size={14} aria-label="Sent" />
              ))}
          </span>
        </div>
        {!selecting && (
          <button
            type="button"
            aria-label="Message actions"
            aria-haspopup="menu"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onOpenMenu(msg, mine ? r.left - 150 : r.right, r.bottom)
            }}
            className={cn(
              'absolute top-1 rounded-full p-1 text-[var(--tg-muted)] opacity-0 hover:bg-black/5 focus-visible:opacity-100 group-hover/msg:opacity-100',
              mine ? '-left-7' : '-right-7',
            )}
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
