import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <header className="p-4">
        <Link to="/" className="font-black text-3xl">𝕏</Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
