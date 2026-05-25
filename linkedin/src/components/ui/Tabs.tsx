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

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-linkedin-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
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
