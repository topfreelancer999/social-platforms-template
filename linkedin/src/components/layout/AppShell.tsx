import { Link, Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'
import { SideNav } from './SideNav'
import { RightRail } from './RightRail'
import { Toast } from '@/components/ui/Toast'

interface AppShellProps {
  showRightRail?: boolean
  showSideNav?: boolean
  centered?: boolean
}

export function AppShell({
  showRightRail = true,
  showSideNav = true,
  centered = true,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-linkedin-bg pt-[52px]">
      <TopNav />
      <Toast />
      <div
        className={`max-w-[1128px] mx-auto px-4 py-6 flex gap-2 ${centered ? '' : 'max-w-full'}`}
      >
        {showSideNav && <SideNav />}
        <main className={`flex-1 min-w-0 ${centered ? 'max-w-[552px] mx-auto lg:mx-0' : ''}`}>
          <Outlet />
        </main>
        {showRightRail && <RightRail />}
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-linkedin-card border-t flex justify-around py-2 z-40">
        {[
          { to: '/', label: 'Home' },
          { to: '/mynetwork', label: 'Network' },
          { to: '/jobs', label: 'Jobs' },
          { to: '/messaging', label: 'Messages' },
          { to: '/notifications', label: 'Alerts' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="text-xs text-linkedin-muted px-2">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  )
}
