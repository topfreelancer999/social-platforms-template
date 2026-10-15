import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-dc-rail text-dc-text flex flex-col">
      <header className="p-4 flex items-center gap-2">
        <span className="bg-dc-blurple text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">D</span>
        <Link to="/" className="font-bold text-xl">Discord</Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4"><Outlet /></main>
    </div>
  )
}
