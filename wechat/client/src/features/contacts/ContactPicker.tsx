import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { displayName, useContacts } from './api'

/** Checkbox list of the user's contacts with a search box. `disabledIds` show as already picked (e.g. group members). */
export function ContactPicker({
  selected,
  onChange,
  disabledIds = [],
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  disabledIds?: string[]
}) {
  const { data, isLoading, isError } = useContacts()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const contacts = (data?.contacts ?? []).filter(
    (c) => !q || displayName(c).toLowerCase().includes(q) || c.username.toLowerCase().includes(q),
  )
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className="bg-wx-panel">
      <div className="px-4 py-2 border-b border-wx-border">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full text-sm bg-wx-bg rounded px-3 py-1.5 outline-none"
        />
      </div>
      {isLoading && <p className="px-4 py-3 text-sm text-wx-muted">Loading contacts…</p>}
      {isError && <p className="px-4 py-3 text-sm text-red-500">Could not load contacts.</p>}
      {!isLoading && !isError && contacts.length === 0 && (
        <p className="px-4 py-3 text-sm text-wx-muted">No contacts found.</p>
      )}
      {contacts.map((c) => {
        const locked = disabledIds.includes(c.id)
        const on = locked || selected.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            disabled={locked}
            onClick={() => toggle(c.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-wx-border text-left hover:bg-wx-bg disabled:hover:bg-transparent"
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                on ? 'bg-wx-green border-wx-green text-white' : 'border-wx-border',
                locked && 'opacity-40',
              )}
            >
              {on && <Check size={14} />}
            </span>
            <img src={c.avatarUrl} alt="" className="w-9 h-9 rounded" />
            <span className="flex-1 text-sm">{displayName(c)}</span>
          </button>
        )
      })}
    </div>
  )
}
