import { Link } from 'react-router-dom'
import { Camera, Radio, Gamepad2, ShoppingBag, Search } from 'lucide-react'

const items = [
  { to: '/moments', icon: Camera, label: 'Moments', color: 'text-orange-500' },
  { to: '/channels', icon: Radio, label: 'Official Accounts', color: 'text-blue-500' },
  { to: '/search', icon: Search, label: 'Search', color: 'text-green-600' },
  { to: '/groups', icon: ShoppingBag, label: 'Communities', color: 'text-purple-500' },
  { to: '/events', icon: Gamepad2, label: 'Events', color: 'text-red-500' },
]

export function DiscoverPage() {
  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border font-medium shrink-0">
        Discover
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-wx-panel mt-2">
          {items.map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-4 px-4 py-3.5 border-b border-wx-border hover:bg-wx-bg"
            >
              <Icon size={24} className={color} />
              <span className="flex-1">{label}</span>
              <span className="text-wx-muted">›</span>
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-wx-muted py-6">Mini Programs & Games (demo placeholders)</p>
      </div>
    </div>
  )
}
