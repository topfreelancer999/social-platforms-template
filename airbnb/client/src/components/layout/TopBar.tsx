import { Link } from 'react-router-dom'
import { Globe, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '../ui/Avatar'

export function TopBar() {
  const { user, logout } = useAuthStore()
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ab-border">
      <div className="max-w-[1760px] mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="text-ab-primary font-bold text-2xl tracking-tight shrink-0">
          airbnb
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/search" className="hover:bg-gray-100 px-3 py-2 rounded-full">Explore</Link>
          <Link to="/feed" className="hover:bg-gray-100 px-3 py-2 rounded-full">Host channel</Link>
          <Link to="/groups" className="hover:bg-gray-100 px-3 py-2 rounded-full">Communities</Link>
          {user && <Link to="/host" className="hover:bg-gray-100 px-3 py-2 rounded-full">Host</Link>}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link to="/host/listing/new" className="hidden md:block text-sm font-semibold hover:bg-gray-100 px-4 py-2 rounded-full">
                Airbnb your home
              </Link>
              <Link to="/trips" className="hidden md:block text-sm font-semibold hover:bg-gray-100 px-3 py-2 rounded-full">Trips</Link>
              <Link to="/wishlists" className="hidden md:block hover:bg-gray-100 p-2 rounded-full">Wishlists</Link>
              <Link to="/messages" className="hidden md:block hover:bg-gray-100 p-2 rounded-full">Messages</Link>
              <Link to="/notifications" className="hidden md:block hover:bg-gray-100 p-2 rounded-full">Alerts</Link>
              <div className="flex items-center gap-2 border border-ab-border rounded-full pl-3 pr-1 py-1 hover:shadow-md">
                <Menu size={16} />
                <Link to={`/profile/${user.username}`}><Avatar src={user.avatarUrl} size="sm" /></Link>
              </div>
              <button type="button" onClick={logout} className="text-xs text-ab-muted hidden lg:block">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold hover:bg-gray-100 px-4 py-2 rounded-full">Log in</Link>
              <Link to="/register" className="text-sm font-semibold text-white bg-ab-primary hover:bg-ab-primary-hover px-4 py-2 rounded-full">Sign up</Link>
            </>
          )}
          <button type="button" className="p-2 hover:bg-gray-100 rounded-full hidden sm:block"><Globe size={18} /></button>
        </div>
      </div>
    </header>
  )
}
