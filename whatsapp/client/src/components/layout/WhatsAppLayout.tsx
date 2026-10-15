import { Link, Outlet, useLocation } from 'react-router-dom'
import { MessageCircle, Circle, Radio, Users, Settings, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const sideNav = [
  { to: '/', icon: MessageCircle, label: 'Chats' },
  { to: '/status', icon: Circle, label: 'Status' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/search', icon: Search, label: 'Search' },
]

export function WhatsAppLayout() {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()
  const inChat = loc.pathname.startsWith('/chat/')

  return (
    <div className="h-screen flex bg-wa-panel text-wa-text">
      <nav className="w-16 md:w-[68px] bg-wa-header flex flex-col items-center py-3 gap-2 shrink-0 border-r border-wa-border">
        {sideNav.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            title={label}
            className={`p-3 rounded-xl hover:bg-wa-border ${loc.pathname === to || (to === '/' && loc.pathname.startsWith('/chat')) ? 'text-wa-teal' : 'text-wa-muted'}`}
          >
            <Icon size={24} />
          </Link>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <Link to="/settings" className="p-3 text-wa-muted hover:text-wa-text" title="Settings">
            <Settings size={22} />
          </Link>
          {user && (
            <Link to={`/profile/${user.username}`}>
              <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            </Link>
          )}
        </div>
      </nav>
      <div className={`flex flex-1 min-w-0 ${inChat ? '' : 'max-w-md border-r border-wa-border'}`}>
        {!inChat && (
          <div className="w-full flex flex-col min-w-0">
            <Outlet />
          </div>
        )}
      </div>
      {inChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-wa-chat text-wa-muted text-center p-8">
          <div>
            <p className="text-2xl font-light mb-2">WhatsApp Clone</p>
            <p className="text-sm">Select a chat to start messaging</p>
          </div>
        </div>
      )}
    </div>
  )
}
