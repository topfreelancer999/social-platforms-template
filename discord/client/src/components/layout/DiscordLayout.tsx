import { Link, Outlet, useLocation } from 'react-router-dom'
import { Compass, MessageCircle, Bell, Settings, Hash, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api, authHeaders } from '@/lib/api'

type ServerItem = { id: string; name: string; iconUrl: string }

export function DiscordLayout() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)
  const loc = useLocation()
  const inChat = loc.pathname.includes('/servers/')
  const { data } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api<{ servers: ServerItem[] }>('/servers', { headers: authHeaders(token!) }),
    enabled: !!token,
  })
  const servers = data?.servers ?? []

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-dc-bg">
      <div className="flex flex-1 min-h-0">
        <nav className="w-[72px] bg-dc-rail flex flex-col items-center py-3 gap-2 shrink-0">
          <Link
            to="/"
            className="w-12 h-12 rounded-2xl bg-dc-blurple flex items-center justify-center text-white font-bold hover:rounded-xl transition-all"
            title="Home"
          >
            D
          </Link>
          <div className="w-8 h-0.5 bg-dc-hover rounded-full" />
          {servers.map((s) => {
            const active = loc.pathname.startsWith(`/servers/${s.id}`)
            return (
              <Link
                key={s.id}
                to={`/servers/${s.id}`}
                title={s.name}
                className={`w-12 h-12 rounded-full overflow-hidden hover:rounded-2xl transition-all ${active ? 'rounded-2xl ring-2 ring-white' : ''}`}
              >
                <img src={s.iconUrl} alt="" className="w-full h-full object-cover" />
              </Link>
            )
          })}
          <Link
            to="/discover"
            className="w-12 h-12 rounded-full bg-dc-sidebar flex items-center justify-center text-dc-green hover:bg-dc-green hover:text-white transition-colors"
            title="Discover servers"
          >
            <Plus size={22} />
          </Link>
        </nav>
        {!inChat && (
          <aside className="hidden md:flex w-60 bg-dc-sidebar flex-col shrink-0">
            <div className="h-12 px-4 flex items-center border-b border-black/20 font-semibold shadow-sm">
              Discord Clone
            </div>
            <div className="flex-1 overflow-y-auto p-2 text-sm space-y-1">
              <Link to="/discover" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-hover text-dc-muted">
                <Compass size={18} /> Discover
              </Link>
              <Link to="/messages" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-hover">
                <MessageCircle size={18} /> Messages
              </Link>
              <Link to="/groups" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-hover">
                <Hash size={18} /> Communities
              </Link>
              <Link to="/posts" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dc-hover">
                <Hash size={18} /> Channel posts
              </Link>
            </div>
            {user && (
              <div className="p-2 bg-dc-channel flex items-center gap-2">
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold truncate">{user.displayName || user.firstName}</p>
                  <p className="text-dc-muted truncate">@{user.username}</p>
                </div>
                <Link to="/settings" className="p-1 hover:bg-dc-hover rounded"><Settings size={16} /></Link>
              </div>
            )}
          </aside>
        )}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {!inChat && (
            <header className="h-12 px-4 flex items-center justify-end gap-2 bg-dc-bg border-b border-black/20 shrink-0">
              <Link to="/search" className="text-sm text-dc-muted hover:text-white">Search</Link>
              <Link to="/notifications" className="p-2 hover:bg-dc-hover rounded"><Bell size={18} /></Link>
              <Link to="/feedback" className="text-sm text-dc-muted hover:text-white">Feedback</Link>
              {user && (
                <Link to={`/users/${user.username}`}>
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                </Link>
              )}
            </header>
          )}
          <div className={`flex-1 min-h-0 ${inChat ? '' : 'overflow-y-auto p-4'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
