import { Check, CheckCheck, Clock3 } from 'lucide-react'
import type { MessageStatus } from './types'

/** WhatsApp ticks: clock → ✓ sent → ✓✓ delivered → blue ✓✓ read. */
export function MessageTicks({ status, className = '' }: { status: MessageStatus | null; className?: string }) {
  if (!status) return null
  if (status === 'pending') {
    return <Clock3 size={13} className={`text-wa-muted shrink-0 ${className}`} aria-label="Sending" />
  }
  if (status === 'sent') {
    return <Check size={16} className={`text-wa-muted shrink-0 ${className}`} aria-label="Sent" />
  }
  return (
    <CheckCheck
      size={16}
      className={`shrink-0 ${status === 'read' ? 'text-wa-tick-read' : 'text-wa-muted'} ${className}`}
      aria-label={status === 'read' ? 'Read' : 'Delivered'}
    />
  )
}
