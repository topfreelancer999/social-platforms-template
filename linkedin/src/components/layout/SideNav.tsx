import { useQuery } from '@tanstack/react-query'
import { Bookmark, Calendar, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function SideNav() {
  const { user } = useAuth()
  const { data: network, isLoading } = useQuery({
    queryKey: ['network-sidebar'],
    queryFn: () => api<{ connections: unknown[] }>('/network', { headers: authHeaders() }),
  })

  return (
    <aside className="hidden lg:block w-[225px] shrink-0 space-y-2">
      <Card padding={false} className="overflow-hidden">
        <div
          className="h-14 bg-cover bg-center"
          style={{ backgroundImage: `url(${user?.coverUrl})` }}
        />
        <div className="px-4 pb-4 -mt-6">
          <Link to={`/in/${user?.username}`}>
            <Avatar
              src={user?.avatarUrl}
              name={`${user?.firstName} ${user?.lastName}`}
              size="lg"
              className="border-2 border-white"
            />
          </Link>
          <Link to={`/in/${user?.username}`} className="block mt-2 hover:underline">
            <p className="font-semibold text-sm">
              {user?.firstName} {user?.lastName}
            </p>
          </Link>
          <p className="text-xs text-linkedin-muted line-clamp-2">{user?.headline}</p>
          <hr className="my-3 border-linkedin-border" />
          <div className="text-xs text-linkedin-muted space-y-1">
            <div className="flex justify-between hover:bg-gray-100 -mx-2 px-2 py-1 rounded cursor-pointer">
              <span>Profile viewers</span>
              <span className="text-linkedin-primary font-semibold">142</span>
            </div>
            <div className="flex justify-between hover:bg-gray-100 -mx-2 px-2 py-1 rounded cursor-pointer">
              <span>Post impressions</span>
              <span className="text-linkedin-primary font-semibold">1,204</span>
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-0">
        <div className="px-4 py-3 text-xs text-linkedin-muted border-b">
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span>{network?.connections?.length ?? 0} connections</span>
          )}
        </div>
        <div className="px-4 py-2 space-y-2 text-sm">
          <Link to="/groups" className="flex items-center gap-2 hover:bg-gray-100 -mx-2 px-2 py-1.5 rounded">
            <Users size={16} className="text-linkedin-muted" />
            Groups
          </Link>
          <Link to="/learning" className="flex items-center gap-2 hover:bg-gray-100 -mx-2 px-2 py-1.5 rounded">
            <GraduationCap size={16} className="text-linkedin-muted" />
            Learning
          </Link>
          <Link to="/events" className="flex items-center gap-2 hover:bg-gray-100 -mx-2 px-2 py-1.5 rounded">
            <Calendar size={16} className="text-linkedin-muted" />
            Events
          </Link>
          <Link to="/jobs" className="flex items-center gap-2 hover:bg-gray-100 -mx-2 px-2 py-1.5 rounded">
            <Bookmark size={16} className="text-linkedin-muted" />
            Saved jobs
          </Link>
        </div>
      </Card>
      <Link to="/premium" className="block">
        <Card className="text-center text-sm">
          <p className="font-semibold text-amber-700">Try Premium</p>
          <p className="text-xs text-linkedin-muted mt-1">1-month free trial</p>
        </Card>
      </Link>
    </aside>
  )
}
