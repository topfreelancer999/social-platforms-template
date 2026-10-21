import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type MenuItem<K extends string> = {
  key: K
  label: string
  icon: LucideIcon
  danger?: boolean
}

/**
 * Context menu anchored at a point (right-click, long-press or the ⋮ button).
 * Arrow keys / Home / End move between items, Esc or Tab closes.
 */
export function MessageMenu<K extends string>({
  x,
  y,
  items,
  onSelect,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem<K>[]
  onSelect: (key: K) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Whatever had focus before the menu opened (e.g. the ⋮ button), restored on Esc.
  const openerRef = useRef<HTMLElement | null>(null)

  // Keep the menu inside the viewport (flip up near the bottom, shift left near the edge).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`
    el.style.top = `${y + height > window.innerHeight - 8 ? Math.max(8, y - height) : y}px`
  }, [x, y])

  const close = useEffectEvent(() => onClose())

  useEffect(() => {
    const el = ref.current
    // `??=` keeps the first value: a re-run effect would otherwise capture our own menu item.
    openerRef.current ??= document.activeElement as HTMLElement | null
    const opener = openerRef.current
    el?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
    const onPointerDown = (e: PointerEvent) => {
      if (!el?.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        opener?.focus()
      }
    }
    const onViewportChange = () => close()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onViewportChange)
    // Capture so scrolling the message list (not just the window) closes the menu.
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [])

  const moveFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const i = buttons.indexOf(document.activeElement as HTMLElement)
    const next =
      e.key === 'ArrowDown' ? (i + 1) % buttons.length
      : e.key === 'ArrowUp' ? (i - 1 + buttons.length) % buttons.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : -1
    if (next >= 0) {
      e.preventDefault()
      buttons[next]?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onClose()
    }
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Message actions"
      onKeyDown={moveFocus}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-44 overflow-hidden rounded-xl bg-white/95 py-1 text-sm shadow-lg ring-1 ring-black/10 backdrop-blur"
    >
      {items.map(({ key, label, icon: Icon, danger }) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onSelect(key)
          }}
          className={cn(
            'flex w-full items-center gap-3 px-4 py-2 text-left outline-none hover:bg-black/5 focus-visible:bg-black/5',
            danger ? 'text-red-600' : 'text-[var(--tg-text)]',
          )}
        >
          <Icon size={18} className={danger ? '' : 'text-[var(--tg-muted)]'} />
          {label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
