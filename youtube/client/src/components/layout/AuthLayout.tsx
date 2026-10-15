import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-yt-bg text-yt-text flex flex-col">
      <header className="p-4 flex items-center gap-2">
        <span className="bg-yt-red text-white font-bold px-1.5 py-0.5 rounded text-sm">▶</span>
        <Link to="/" className="font-bold text-xl">YouTube</Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4"><Outlet /></main>
    </div>
  )
}
