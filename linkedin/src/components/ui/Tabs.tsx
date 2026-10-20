import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

function keepVisible(el: HTMLButtonElement | null) {
  const strip = el?.parentElement
  if (!el || !strip) return
  if (el.offsetLeft < strip.scrollLeft) strip.scrollLeft = el.offsetLeft
  else if (el.offsetLeft + el.offsetWidth > strip.scrollLeft + strip.clientWidth) {
    strip.scrollLeft = el.offsetLeft + el.offsetWidth - strip.clientWidth
  }
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-linkedin-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          // On narrow screens keep the active tab scrolled into view (horizontally only).
          ref={active === tab.id ? keepVisible : undefined}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap',
            active === tab.id
              ? 'border-linkedin-primary text-linkedin-primary'
              : 'border-transparent text-linkedin-muted hover:text-linkedin-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
