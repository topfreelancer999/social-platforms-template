import { Link } from 'react-router-dom'
import { Home, Compass, PlusSquare, Inbox, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function BottomNav({ active }: { active?: string }) {
  const user = useAuthStore((s) => s.user)
  const item = (key: string, to: string, Icon: typeof Home, label: string) => (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 text-[10px] ${active === key ? 'text-white' : 'text-tt-muted'}`}
    >
      <Icon size={24} strokeWidth={active === key ? 2.5 : 2} />
      <span>{label}</span>
    </Link>
  )
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/90 border-t border-white/10 px-6 py-2 flex justify-between items-center max-w-lg mx-auto">
      {item('home', '/', Home, 'Home')}
      {item('discover', '/discover', Compass, 'Discover')}
      <Link to="/upload" className="flex flex-col items-center -mt-4">
        <div className="bg-white/10 border border-white/30 rounded-lg p-2">
          <PlusSquare size={22} className="text-tt-secondary" />
        </div>
      </Link>
      {item('inbox', '/inbox', Inbox, 'Inbox')}
      {item('profile', user ? `/@${user.username}` : '/login', User, 'Profile')}
    </nav>
  )
}
