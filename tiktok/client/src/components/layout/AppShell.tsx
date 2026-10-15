import { Link, Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { SideNav } from './SideNav'
import { RightRail } from './RightRail'

export function AppShell() {
  return (
    <div className="min-h-screen bg-fb-bg pt-14">
      <TopBar />
      <div className="max-w-[1920px] mx-auto flex gap-4 px-4 py-4 justify-center">
        <SideNav />
        <main className="w-full max-w-[680px] min-w-0"><Outlet /></main>
        <RightRail />
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-fb-card border-t flex justify-around py-2 z-40 text-xs">
        {['/', '/friends', '/messages', '/notifications'].map((to) => (
          <Link key={to} to={to} className="text-fb-muted px-3">{to === '/' ? 'Home' : to.slice(1)}</Link>
        ))}
      </nav>
      <div className="h-14 lg:hidden" />
    </div>
  )
}
