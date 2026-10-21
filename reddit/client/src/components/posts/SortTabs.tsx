import { Flame, Sparkles, Swords, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'

const SORTS = [
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'controversial', label: 'Controversial', icon: Swords },
] as const

export type PostSort = (typeof SORTS)[number]['id']

/** Feed sort bar; every option except New ranks by real vote tallies. */
export function SortTabs({ value, onChange }: { value: PostSort; onChange: (sort: PostSort) => void }) {
  return (
    <div role="tablist" aria-label="Sort posts" className="bg-rd-card border border-rd-border rounded-lg flex mb-3 overflow-hidden text-sm font-semibold">
      {SORTS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'flex-1 min-w-0 py-2 px-1 flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rd-blue',
            value === id ? 'bg-rd-bg text-rd-orange border-b-2 border-rd-orange' : 'text-rd-muted hover:bg-rd-bg',
          )}
        >
          <Icon size={16} className="shrink-0 hidden sm:block" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  )
}
