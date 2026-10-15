import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Plus, MessageCircle, Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function RedditLayout() {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()

  return (
    <div className="min-h-screen bg-rd-bg">
      <header className="sticky top-0 z-50 bg-rd-card border-b border-rd-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full bg-rd-orange flex items-center justify-center text-white font-bold text-lg">r</span>
            <span className="font-bold text-rd-orange hidden sm:inline">reddit</span>
          </Link>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q') as string
              if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`
            }}
            className="flex-1 max-w-xl"
          >
            <div className="flex items-center bg-rd-bg border border-rd-border rounded-full px-4 py-1.5">
              <Search size={18} className="text-rd-muted mr-2" />
              <input name="q" placeholder="Search Reddit" className="flex-1 bg-transparent text-sm outline-none" />
            </div>
          </form>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/submit" className="hidden sm:flex items-center gap-1 bg-rd-card border border-rd-border rounded-full px-3 py-1 text-sm font-semibold hover:bg-rd-bg">
              <Plus size={18} /> Create Post
            </Link>
            <Link to="/messages" className="p-2 hover:bg-rd-bg rounded-full"><MessageCircle size={22} /></Link>
            <Link to="/notifications" className="p-2 hover:bg-rd-bg rounded-full"><Bell size={22} /></Link>
            {user ? (
              <Link to={`/profile/${user.username}`}>
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-rd-border" />
              </Link>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-rd-blue">Log In</Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4">
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
          <nav className="bg-rd-card border border-rd-border rounded-lg overflow-hidden">
            <Link to="/" className={`flex items-center gap-3 px-4 py-2.5 hover:bg-rd-bg ${loc.pathname === '/' ? 'bg-rd-bg font-semibold' : ''}`}>
              <Home size={20} /> Home
            </Link>
            <Link to="/subreddits" className="flex items-center gap-3 px-4 py-2.5 hover:bg-rd-bg">Communities</Link>
            <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 hover:bg-rd-bg">Join Groups</Link>
            <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 hover:bg-rd-bg">Settings</Link>
            <Link to="/feedback" className="flex items-center gap-3 px-4 py-2.5 hover:bg-rd-bg">Feedback</Link>
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
