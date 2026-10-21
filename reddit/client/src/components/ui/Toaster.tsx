import { X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div aria-live="polite" className="fixed bottom-4 inset-x-4 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center gap-3 max-w-sm w-full bg-rd-text text-white text-sm rounded-lg shadow-lg px-4 py-3"
        >
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="p-1 rounded hover:bg-white/10">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
