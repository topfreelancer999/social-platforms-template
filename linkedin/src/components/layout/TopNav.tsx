import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Briefcase,
  Home,
  MessageSquare,
  Search,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { authHeaders } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/mynetwork', icon: Users, label: 'My Network' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/messaging', icon: MessageSquare, label: 'Messaging' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

export function TopNav() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () =>
      api<{ unread: number }>('/notifications', { headers: authHeaders() }),
    refetchInterval: 30000,
  })

  const { data: threads } = useQuery({
    queryKey: ['threads-unread'],
    queryFn: () =>
      api<{ unread: number }[]>('/messages/threads', {
        headers: authHeaders(),
      }),
    refetchInterval: 30000,
  })

  const msgUnread = threads?.reduce((s, t) => s + (t.unread ?? 0), 0) ?? 0

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/search/all?q=${encodeURIComponent(search)}`, { replace: true })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-linkedin-card border-b border-linkedin-border h-[52px]">
      <div className="max-w-[1128px] mx-auto px-4 h-full flex items-center gap-2">
        <Link to="/" className="shrink-0 text-linkedin-primary font-bold text-2xl">
          in
        </Link>
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-[280px]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-linkedin-muted" size={16} />
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-1.5 bg-[#EDF3F8] rounded text-sm focus:outline-none focus:ring-1 focus:ring-linkedin-primary"
            />
          </div>
        </form>
        <nav className="flex flex-1 justify-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isMsg = label === 'Messaging'
            const isNotif = label === 'Notifications'
            const badge = isNotif
              ? notifData?.unread
              : isMsg
                ? msgUnread
                : 0
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center min-w-[80px] px-2 py-1 text-linkedin-muted hover:text-linkedin-text relative',
                  'text-xs',
                )}
              >
                <Icon size={24} />
                <span className="hidden lg:block mt-0.5">{label}</span>
                {badge ? (
                  <span className="absolute top-0 right-2 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
        <Link
          to={user ? `/in/${user.username}` : '/login'}
          className="flex flex-col items-center min-w-[80px] text-xs text-linkedin-muted"
        >
          <Avatar src={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size="sm" />
          <span className="hidden lg:block mt-0.5">Me</span>
        </Link>
      </div>
    </header>
  )
}
