import { Outlet, Link } from 'react-router-dom'
import { Toast } from '@/components/ui/Toast'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-linkedin-bg flex flex-col">
      <Toast />
      <header className="px-6 py-4">
        <Link to="/" className="text-linkedin-primary font-bold text-3xl">
          Linked<span className="font-normal text-linkedin-text">in</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-linkedin-muted py-6">
        LinkedIn Clone · Demo application · © 2026
      </footer>
    </div>
  )
}
