import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Home, Bell, Feather, Mail, Search, Users } from 'lucide-react'
import { TopBar } from './TopBar'
import { RightRail } from './RightRail'
import { useAuthStore } from '@/stores/authStore'
import { ComposeModal } from '@/features/feed/ComposeModal'

const nav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/messages', icon: Mail, label: 'Messages' },
  { to: '/communities', icon: Users, label: 'Communities' },
]

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const [composing, setComposing] = useState(false)
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-[1280px] mx-auto flex">
        <aside className="hidden sm:flex flex-col w-[68px] xl:w-[275px] shrink-0 px-2 xl:px-3 py-2 h-screen self-start border-r border-x-border-light dark:border-x-border sticky top-0">
          <Link to="/" className="text-2xl font-black p-3 mb-2 hidden xl:block">𝕏</Link>
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-4 p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-x-text-light dark:text-x-text font-medium"
              >
                <Icon size={26} />
                <span className="hidden xl:inline text-xl">{label}</span>
              </Link>
            ))}
            <Link to={`/profile/${user?.username}`} className="flex items-center gap-4 p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
              <span className="hidden xl:inline text-xl font-medium">Profile</span>
            </Link>
          </nav>
          <button
            onClick={() => setComposing(true)}
            className="hidden xl:flex bg-x-primary hover:bg-x-primary-hover text-white font-bold rounded-full py-3 justify-center mt-4"
          >
            Post
          </button>
          <button
            onClick={() => setComposing(true)}
            aria-label="Post"
            className="xl:hidden h-12 w-12 mx-auto flex items-center justify-center bg-x-primary hover:bg-x-primary-hover text-white rounded-full mt-4"
          >
            <Feather size={22} />
          </button>
        </aside>
        <main className="flex-1 min-w-0 max-w-[600px] border-r border-x-border-light dark:border-x-border min-h-screen">
          <Outlet />
        </main>
        <RightRail />
      </div>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur border-t border-x-border-light dark:border-x-border flex justify-around py-2 z-40">
        {nav.slice(0, 4).map(({ to, icon: Icon }) => (
          <Link key={to} to={to} className="p-2 text-x-text-light dark:text-x-text"><Icon size={24} /></Link>
        ))}
      </nav>
      <button
        onClick={() => setComposing(true)}
        aria-label="Post"
        className="sm:hidden fixed right-4 bottom-20 z-40 h-14 w-14 flex items-center justify-center rounded-full bg-x-primary hover:bg-x-primary-hover text-white shadow-lg"
      >
        <Feather size={24} />
      </button>
      <div className="h-14 sm:hidden" />
      <TopBar />
      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  )
}
