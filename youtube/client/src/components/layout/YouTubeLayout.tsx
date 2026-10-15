import { Link, Outlet } from 'react-router-dom'
import { Home, Compass, PlaySquare, Clock, ThumbsUp, Users, MessageSquare, Bell, Settings, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

const nav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/subscriptions', icon: PlaySquare, label: 'Subscriptions' },
  { to: '/channel-feed', icon: Users, label: 'Channel posts' },
  { to: '/groups', icon: Users, label: 'Communities' },
  { to: '/trending', icon: Compass, label: 'Trending' },
  { to: '/studio/upload', icon: PlaySquare, label: 'Upload' },
]

export function YouTubeLayout() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(true)
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-yt-bg px-4 h-14 flex items-center gap-4 border-b border-yt-surface">
        <button type="button" onClick={() => setOpen(!open)} className="p-2 hover:bg-yt-hover rounded-full">
          <Menu size={22} />
        </button>
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="bg-yt-red text-white font-bold px-1.5 py-0.5 rounded text-sm">▶</span>
          <span className="font-bold text-lg hidden sm:inline">YouTube</span>
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q') as string
            if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`
          }}
          className="flex-1 max-w-2xl mx-auto flex"
        >
          <input name="q" placeholder="Search" className="w-full bg-yt-bg border border-yt-hover rounded-l-full px-4 py-2 text-sm outline-none focus:border-blue-500" />
          <button type="submit" className="bg-yt-hover border border-yt-hover border-l-0 rounded-r-full px-5 hover:bg-yt-surface">Search</button>
        </form>
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link to="/studio/upload" className="hidden md:flex items-center gap-2 bg-yt-surface hover:bg-yt-hover px-3 py-1.5 rounded-full text-sm">
                <span className="text-lg">+</span> Create
              </Link>
              <Link to="/inbox" className="p-2 hover:bg-yt-hover rounded-full"><MessageSquare size={22} /></Link>
              <Link to="/notifications" className="p-2 hover:bg-yt-hover rounded-full"><Bell size={22} /></Link>
              <Link to={`/channel/${user.username}`}><img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" /></Link>
            </>
          ) : (
            <Link to="/login" className="text-sm border border-yt-hover px-3 py-1.5 rounded-full hover:bg-yt-hover">Sign in</Link>
          )}
        </div>
      </header>
      <div className="flex flex-1">
        {open && (
          <aside className="hidden md:block w-56 shrink-0 p-2 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            {nav.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="flex items-center gap-5 px-3 py-2 rounded-lg hover:bg-yt-hover text-sm">
                <Icon size={22} /> {label}
              </Link>
            ))}
            {user && (
              <>
                <p className="text-xs font-semibold text-yt-muted px-3 mt-4 mb-2">You</p>
                <Link to="/playlists" className="flex items-center gap-5 px-3 py-2 rounded-lg hover:bg-yt-hover text-sm"><Clock size={22} /> Playlists</Link>
                <Link to="/settings" className="flex items-center gap-5 px-3 py-2 rounded-lg hover:bg-yt-hover text-sm"><Settings size={22} /> Settings</Link>
                <Link to="/feedback" className="flex items-center gap-5 px-3 py-2 rounded-lg hover:bg-yt-hover text-sm"><ThumbsUp size={22} /> Feedback</Link>
              </>
            )}
          </aside>
        )}
        <main className="flex-1 p-4 pb-8 min-w-0"><Outlet /></main>
      </div>
    </div>
  )
}
