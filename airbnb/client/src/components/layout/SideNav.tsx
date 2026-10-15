import { Link } from 'react-router-dom'
import { Bookmark, Calendar, Flag, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '../ui/Avatar'
import { Card } from '../ui/Card'

export function SideNav() {
  const user = useAuthStore((s) => s.user)
  return (
    <aside className="hidden lg:block w-[360px] shrink-0 space-y-4 sticky top-16 self-start">
      <Link to={`/profile/${user?.username}`} className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-lg">
        <Avatar src={user?.avatarUrl} size="lg" />
        <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
      </Link>
      <Card className="p-2">
        {[
          { to: '/friends', icon: Users, label: 'Friends' },
          { to: '/groups', icon: Flag, label: 'Groups' },
          { to: '/events', icon: Calendar, label: 'Events' },
          { to: '/feedback', icon: Bookmark, label: 'Feedback' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-lg text-sm font-medium">
            <Icon size={20} className="text-fb-primary" /> {label}
          </Link>
        ))}
      </Card>
    </aside>
  )
}
