import { useEffect, useEffectEvent } from 'react'
import { cn } from '@/lib/cn'

/** Modal shell: bottom sheet on phones, centered card on larger screens. Esc / backdrop closes. */
export function Sheet({
  onClose,
  labelledBy,
  className,
  children,
}: {
  onClose: () => void
  labelledBy?: string
  className?: string
  children: React.ReactNode
}) {
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onEscape(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={cn('w-full sm:max-w-[400px] bg-ig-elevated rounded-t-2xl sm:rounded-xl overflow-hidden', className)}
      >
        {children}
      </div>
    </div>
  )
}

/** Instagram-style confirmation: title, explanation, one primary action and Cancel. */
export function ConfirmSheet({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  pending,
  destructive,
  error,
  image,
}: {
  title: string
  children?: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  destructive?: boolean
  error?: string | null
  image?: string
}) {
  return (
    <Sheet onClose={onCancel} labelledBy="confirm-sheet-title">
      <div className="px-6 pt-6 pb-4 text-center">
        {image && <img src={image} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />}
        <h2 id="confirm-sheet-title" className="text-lg font-semibold">{title}</h2>
        {children && <div className="mt-2 text-sm text-ig-muted">{children}</div>}
        {error && <p role="alert" className="mt-3 text-sm text-ig-danger">{error}</p>}
      </div>
      <div className="border-t border-ig-border-strong flex flex-col">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            'py-3.5 text-sm font-bold hover:bg-white/5 disabled:opacity-50',
            destructive ? 'text-ig-danger' : 'text-ig-blue',
          )}
        >
          {pending ? 'Please wait…' : confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className="py-3.5 text-sm border-t border-ig-border-strong hover:bg-white/5">
          Cancel
        </button>
      </div>
    </Sheet>
  )
}
