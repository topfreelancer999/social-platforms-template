import { Link, NavLink, Outlet } from 'react-router-dom'
import { Bell, Home, LayoutGrid, MessageCircle, Plus, Search, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'

const nav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: LayoutGrid, label: 'Explore' },
  { to: '/create', icon: Plus, label: 'Create', primary: true },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function PinterestLayout() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-[var(--pin-border)] bg-white px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--pin-red)] text-lg font-bold text-white">
            P
          </span>
          <span className="hidden text-xl font-bold text-[var(--pin-red)] sm:inline">Pinterest</span>
        </Link>

        <Link
          to="/search"
          className="flex flex-1 max-w-xl items-center gap-2 rounded-full bg-[#efefef] px-4 py-2.5 text-sm text-[var(--pin-gray)] hover:bg-[#e2e2e2]"
        >
          <Search size={18} />
          Search pins, boards, people…
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(({ to, icon: Icon, label, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold ${
                  isActive ? 'bg-black text-white' : 'text-[#111] hover:bg-[#efefef]'
                } ${primary ? 'bg-[var(--pin-red)] text-white hover:bg-[var(--pin-red-hover)] hover:text-white' : ''}`
              }
            >
              <Icon size={20} />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <Link to="/notifications" className="rounded-full p-2 hover:bg-[#efefef]" title="Notifications">
          <Bell size={22} />
        </Link>
        <Link to="/settings" className="hidden text-sm font-semibold text-[var(--pin-gray)] hover:text-black sm:inline">
          Settings
        </Link>
        {user && (
          <Link to="/profile">
            <Avatar src={user.avatarUrl} name={user.username} size="sm" />
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-[var(--pin-border)] bg-white py-2 md:hidden">
        {nav.map(({ to, icon: Icon, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `p-2 ${isActive ? 'text-[var(--pin-red)]' : 'text-[var(--pin-gray)]'} ${primary ? 'text-[var(--pin-red)]' : ''}`
            }
          >
            <Icon size={24} strokeWidth={primary ? 2.5 : 2} />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
