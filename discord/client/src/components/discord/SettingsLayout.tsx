import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type SettingsSection = { id: string; label: string; to: string; disabled?: boolean }

/**
 * Full-screen settings overlay modelled on Discord's: sidebar of sections on the
 * left, content on the right, ESC / ✕ to close. Collapses to top tabs on phones.
 */
export function SettingsLayout({
  heading,
  sections,
  active,
  onClose,
  children,
}: {
  heading: string
  sections: SettingsSection[]
  active: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-dc-bg text-dc-text">
      <aside className="md:w-[35%] md:min-w-[218px] bg-dc-sidebar md:flex md:justify-end shrink-0">
        <nav className="md:w-[218px] px-3 md:px-2 py-3 md:py-14 flex md:block items-center gap-1 overflow-x-auto">
          <p className="hidden md:block text-[11px] font-bold uppercase text-dc-muted px-2.5 pb-1.5 truncate">{heading}</p>
          <p className="md:hidden text-xs font-bold uppercase text-dc-muted pr-2 shrink-0 max-w-[40%] truncate">{heading}</p>
          {sections.map((s) =>
            s.disabled ? (
              <span key={s.id} className="block px-2.5 py-1.5 rounded text-[15px] text-dc-muted/50 shrink-0 cursor-not-allowed" title="You do not have permission">
                {s.label}
              </span>
            ) : (
              <Link
                key={s.id}
                to={s.to}
                replace
                className={cn(
                  'block px-2.5 py-1.5 rounded text-[15px] shrink-0 md:mb-0.5',
                  active === s.id ? 'bg-dc-hover text-white' : 'text-dc-muted hover:bg-dc-hover/60 hover:text-dc-text',
                )}
              >
                {s.label}
              </Link>
            ),
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="md:hidden ml-auto shrink-0 w-8 h-8 rounded-full border-2 border-dc-muted text-dc-muted flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </nav>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <div className="flex">
          <div className="flex-1 min-w-0 max-w-[740px] px-4 md:px-10 py-5 md:py-14">{children}</div>
          <div className="hidden md:block pt-14 pr-5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="w-9 h-9 rounded-full border-2 border-dc-muted text-dc-muted hover:text-white hover:border-white flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <p className="text-[13px] font-semibold text-dc-muted text-center mt-1">ESC</p>
          </div>
        </div>
      </main>
    </div>
  )
}
