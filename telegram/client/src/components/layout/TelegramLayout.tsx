import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Hash, MessageCircle, Search, Settings, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { ChatsListPage } from '@/features/chats/ChatsListPage'
import { ChannelsPage } from '@/features/channels/ChannelsPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { GroupsPage } from '@/features/groups/GroupsPage'

const sideLinks = [
  { to: '/', icon: MessageCircle, label: 'Chats' },
  { to: '/channels', icon: Hash, label: 'Channels' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/groups', icon: Users, label: 'Groups' },
]

function SidebarList() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/channels') && pathname.split('/').length === 2) return <ChannelsPage />
  if (pathname.startsWith('/contacts')) return <ContactsPage />
  if (pathname.startsWith('/groups')) return <GroupsPage />
  return <ChatsListPage />
}

export function TelegramLayout() {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const listOnly = ['/', '/channels', '/contacts', '/groups'].includes(pathname)
  const hasMain = !listOnly
  const hideSidebarOnMobile =
    hasMain && (pathname.startsWith('/chat/') || /^\/channels\/[^/]+/.test(pathname))

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[var(--tg-sidebar)]">
      <aside
        className={`flex w-full max-w-xs shrink-0 flex-col border-r border-black/5 bg-[var(--tg-sidebar)] md:w-80 ${
          hideSidebarOnMobile ? 'hidden md:flex' : 'flex'
        }`}
      >
        <header className="flex items-center gap-2 bg-[var(--tg-blue)] px-3 py-3 text-white">
          <span className="flex-1 font-semibold">Telegram</span>
          <Link to="/search" className="rounded p-1 hover:bg-white/10">
            <Search size={20} />
          </Link>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-black/5 px-2 py-2">
          {sideLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  isActive ? 'bg-[var(--tg-blue)] text-white' : 'bg-white/80 text-[var(--tg-muted)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto">
          <SidebarList />
        </div>

        <footer className="flex items-center justify-between border-t border-black/5 bg-white px-3 py-2">
          <Link to="/profile" className="flex items-center gap-2 text-sm font-medium">
            {user && <Avatar src={user.avatarUrl} name={user.username} size="sm" />}
            <span className="truncate">@{user?.username}</span>
          </Link>
          <Link to="/settings" className="text-[var(--tg-muted)] hover:text-[var(--tg-blue)]">
            <Settings size={20} />
          </Link>
        </footer>
      </aside>

      <main className={`flex flex-1 flex-col bg-[var(--tg-chat-bg)] ${hasMain ? 'flex' : 'hidden md:flex'}`}>
        {hasMain ? (
          <Outlet />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--tg-muted)]">
            <MessageCircle size={64} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a chat to start messaging</p>
          </div>
        )}
      </main>
    </div>
  )
}
