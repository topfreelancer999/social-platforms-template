import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="p-4">
        <Link to="/" className="text-2xl font-bold">
          <span className="text-white">Tik</span>
          <span className="text-tt-secondary">Tok</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
