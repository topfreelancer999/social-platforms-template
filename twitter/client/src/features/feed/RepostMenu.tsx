import { useEffect, useRef, useState } from 'react'
import { PenLine, Repeat2 } from 'lucide-react'

/** Repost button that opens the X-style "Repost / Quote" menu. */
export function RepostMenu({
  reposted,
  count,
  onRepost,
  onQuote,
}: {
  reposted: boolean
  count: number
  onRepost: () => void
  onQuote: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={reposted ? 'Undo repost' : 'Repost'}
        className={`flex items-center gap-1 hover:text-green-500 text-xs group ${reposted ? 'text-green-500' : ''}`}
      >
        <Repeat2 size={18} className="group-hover:bg-green-500/10 rounded-full p-0.5" />
        {count}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 min-w-[160px] rounded-xl bg-white dark:bg-black shadow-[0_0_15px_rgba(101,119,134,0.2)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden"
        >
          <button
            role="menuitem"
            onClick={choose(onRepost)}
            className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-x-text-light dark:text-x-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
          >
            <Repeat2 size={18} /> {reposted ? 'Undo repost' : 'Repost'}
          </button>
          <button
            role="menuitem"
            onClick={choose(onQuote)}
            className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-x-text-light dark:text-x-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
          >
            <PenLine size={18} /> Quote
          </button>
        </div>
      )}
    </div>
  )
}
