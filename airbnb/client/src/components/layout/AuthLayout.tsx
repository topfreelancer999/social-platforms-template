import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b border-ab-border">
        <Link to="/" className="text-ab-primary font-bold text-2xl">airbnb</Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
