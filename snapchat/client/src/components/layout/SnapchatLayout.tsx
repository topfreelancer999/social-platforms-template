import { Link, NavLink, Outlet } from 'react-router-dom'
import { Camera, Compass, MessageCircle, MapPin, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'

const nav = [
  { to: '/map', icon: MapPin, label: 'Map' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/camera', icon: Camera, label: 'Camera', primary: true },
  { to: '/discover', icon: Compass, label: 'Stories' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function SnapchatLayout() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <Link to="/" className="text-xl font-bold tracking-tight" style={{ color: 'var(--sc-yellow)' }}>
          Snapchat
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/search" className="text-sm text-white/70 hover:text-white">
            Search
          </Link>
          <Link to="/friends" className="text-sm text-white/70 hover:text-white">
            Friends
          </Link>
          <Link to="/settings" className="text-sm text-white/70 hover:text-white">
            Settings
          </Link>
          {user && (
            <Link to="/profile">
              <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/95 backdrop-blur">
        <ul className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {nav.map(({ to, icon: Icon, label, primary }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                    isActive ? 'text-[var(--sc-yellow)]' : 'text-white/50'
                  }`
                }
              >
                <span
                  className={
                    primary
                      ? 'flex h-12 w-12 items-center justify-center rounded-full border-4 border-[var(--sc-yellow)] bg-[var(--sc-yellow)] text-black'
                      : ''
                  }
                >
                  <Icon className={primary ? 'h-6 w-6' : 'h-6 w-6'} strokeWidth={primary ? 2.5 : 2} />
                </span>
                {!primary && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
