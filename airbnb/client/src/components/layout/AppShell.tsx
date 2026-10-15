import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { TopBar } from './TopBar'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Outlet />
      <footer className="border-t border-ab-border mt-auto py-8 px-4 text-sm text-ab-muted text-center">
        © Airbnb clone demo · <Link to="/feedback" className="underline">Feedback</Link> · <Link to="/events" className="underline">Experiences</Link>
      </footer>
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ab-border flex justify-around py-2 text-xs z-40">
          <Link to="/">Explore</Link>
          <Link to="/wishlists">Wishlists</Link>
          <Link to="/trips">Trips</Link>
          <Link to="/messages">Inbox</Link>
          <Link to={`/profile/${user.username}`}>Profile</Link>
        </div>
      )}
    </div>
  )
}
