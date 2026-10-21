import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/** Native modal <dialog>: focus trap, Esc to close and backdrop come from the browser. */
export function Modal({
  labelledBy,
  onClose,
  className,
  children,
}: {
  labelledBy: string
  onClose: () => void
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cn(
        'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--tg-text)] shadow-xl backdrop:bg-black/40',
        className,
      )}
    >
      {children}
    </dialog>
  )
}
