import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { QrCode, Settings, Bell, MessageSquare, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { api, authHeaders } from '@/lib/api'

export function MePage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)

  const { data } = useQuery({
    queryKey: ['me-profile', user?.username],
    queryFn: () =>
      api<{ user: { wechatId?: string; about: string } }>(`/users/${user!.username}`, { headers: authHeaders(token!) }),
    enabled: !!user && !!token,
  })

  const menu = [
    { to: user ? `/moments/user/${user.username}` : '/moments', icon: MessageSquare, label: 'Moments' },
    { to: '/channels', icon: Star, label: 'Official Accounts' },
    { to: '/groups', icon: Star, label: 'Communities' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
  ]

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-end px-4 bg-wx-panel border-b border-wx-border shrink-0 gap-4">
        <QrCode size={22} className="text-wx-muted" />
      </header>
      {user && (
        <Link to={`/profile/${user.username}`} className="flex items-center gap-4 bg-wx-panel p-6 mb-2">
          <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-lg" />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-medium">{user.displayName || user.firstName}</p>
            <p className="text-sm text-wx-muted">WeChat ID: {data?.user.wechatId || user.username}</p>
            <p className="text-sm text-wx-muted truncate mt-1">{data?.user.about}</p>
          </div>
          <span className="text-wx-muted">›</span>
        </Link>
      )}
      <div className="bg-wx-panel">
        {menu.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center gap-4 px-4 py-3.5 border-b border-wx-border">
            <Icon size={22} className="text-wx-green" />
            <span className="flex-1">{label}</span>
            <span className="text-wx-muted">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
