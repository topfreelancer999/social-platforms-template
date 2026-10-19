import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/host', label: 'Reservations', end: true },
  { to: '/host/calendar', label: 'Calendar', end: false },
]

/** Hosting sub-navigation shared by the host dashboard pages. */
export function HostTabs() {
  return (
    <nav aria-label="Hosting" className="flex gap-1 border-b border-ab-border mb-6 overflow-x-auto">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px',
              isActive ? 'border-ab-text text-ab-text' : 'border-transparent text-ab-muted hover:text-ab-text',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
