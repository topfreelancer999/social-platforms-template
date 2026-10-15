import { Link, useNavigate } from 'react-router-dom'
import { Bell, Home, MessageCircle, Search, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '../ui/Avatar'

export function TopBar() {
  const { user, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const { data: notif } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api<{ unread: number }>('/notifications', { headers: authHeaders(accessToken) }),
    refetchInterval: 20000,
  })
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-fb-card shadow-sm h-14 flex items-center px-4 gap-2">
      <Link to="/" className="text-fb-primary font-bold text-3xl shrink-0">f</Link>
      <form onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q'); navigate(`/search?q=${q}`) }} className="hidden sm:flex flex-1 max-w-[280px]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-fb-muted" size={16} />
          <input name="q" placeholder="Search Facebook" className="w-full bg-[#f0f2f5] rounded-full pl-10 pr-4 py-2 text-sm" />
        </div>
      </form>
      <nav className="flex flex-1 justify-center gap-1">
        {[{ to: '/', icon: Home }, { to: '/friends', icon: Users }, { to: '/messages', icon: MessageCircle }, { to: '/notifications', icon: Bell }].map(({ to, icon: Icon }) => (
          <Link key={to} to={to} className="relative flex items-center justify-center w-14 h-12 hover:bg-[#f0f2f5] rounded-lg text-fb-primary">
            <Icon size={24} />
            {to === '/notifications' && notif?.unread ? (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center">{notif.unread}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <Link to={`/profile/${user?.username}`}><Avatar src={user?.avatarUrl} name={user?.firstName} /></Link>
    </header>
  )
}
