import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Search, PlusSquare, Film, User, MessageCircle, Heart } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const nav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/create', icon: PlusSquare, label: 'Create' },
  { to: '/reels', icon: Film, label: 'Reels' },
]

export function InstagramLayout() {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()
  const profileTo = user ? `/profile/${user.username}` : '/login'

  return (
    <div className="min-h-screen flex flex-col max-w-[935px] mx-auto border-x border-ig-border">
      <header className="sticky top-0 z-50 bg-ig-bg border-b border-ig-border h-14 px-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'cursive' }}>
          Instagram
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/search" className="hidden sm:block hover:opacity-70"><Search size={24} /></Link>
          <Link to="/messages" className="hover:opacity-70"><MessageCircle size={24} /></Link>
          <Link to="/notifications" className="hover:opacity-70"><Heart size={24} /></Link>
          {user && (
            <Link to={profileTo}>
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ig-bg border-t border-ig-border h-12 flex items-center justify-around z-50">
        {nav.map(({ to, icon: Icon }) => (
          <Link key={to} to={to} className={`p-2 ${loc.pathname === to ? 'opacity-100' : 'opacity-60'}`}>
            <Icon size={26} strokeWidth={loc.pathname === to ? 2.5 : 1.5} />
          </Link>
        ))}
        <Link to={profileTo} className={`p-2 ${loc.pathname.startsWith('/profile') ? 'opacity-100' : 'opacity-60'}`}>
          <User size={26} />
        </Link>
      </nav>

      <aside className="hidden md:flex fixed left-[max(0px,calc(50%-470px-200px))] top-20 w-[200px] flex-col gap-2 text-[15px]">
        {nav.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ig-hover ${loc.pathname === to ? 'font-bold' : ''}`}
          >
            <Icon size={24} /> {label}
          </Link>
        ))}
        <Link to="/groups" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ig-hover">Communities</Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ig-hover">Settings</Link>
        <Link to="/feedback" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ig-hover">Feedback</Link>
      </aside>
    </div>
  )
}
