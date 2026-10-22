import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ThreadComposer } from './ThreadComposer'

/** The "Post" modal from the side / mobile nav; supports threads like the home composer. */
export function ComposeModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-[#5b7083]/40 sm:pt-12"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Create post"
    >
      <div className="w-full h-full sm:h-auto sm:max-w-[600px] bg-white dark:bg-black sm:rounded-2xl shadow-xl flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="flex items-center px-2 py-2">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-3 overflow-y-auto">
          <ThreadComposer autoFocus onPosted={onClose} />
        </div>
      </div>
    </div>
  )
}
