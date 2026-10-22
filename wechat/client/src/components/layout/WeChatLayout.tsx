import { Link, Outlet, useLocation } from 'react-router-dom'
import { MessageCircle, Users, Compass, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const tabs = [
  { to: '/', icon: MessageCircle, label: 'WeChat' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/me', icon: User, label: 'Me' },
]

export function WeChatLayout() {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()
  const inChat = loc.pathname.startsWith('/chat/')
  const hideTabs =
    inChat ||
    loc.pathname.startsWith('/moments/post') ||
    loc.pathname.startsWith('/group-chat/') ||
    loc.pathname.startsWith('/contacts/new')

  if (inChat) {
    return (
      <div className="h-screen flex flex-col bg-wx-chat">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-wx-panel shadow-lg">
      <main className={`flex-1 overflow-hidden flex flex-col ${hideTabs ? '' : 'pb-14'}`}>
        <Outlet />
      </main>
      {!hideTabs && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto h-14 bg-wx-panel border-t border-wx-border flex z-50">
          {tabs.map(({ to, icon: Icon, label }) => {
            const active = to === '/me' ? loc.pathname.startsWith('/me') || loc.pathname.startsWith('/profile') : loc.pathname === to || (to === '/' && loc.pathname.startsWith('/chat') === false && loc.pathname === '/')
            const path = to === '/me' && user ? `/me` : to
            return (
              <Link
                key={to}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${active ? 'text-wx-green' : 'text-wx-muted'}`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
