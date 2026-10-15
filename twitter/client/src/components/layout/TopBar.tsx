import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

export function TopBar() {
  return (
    <header className="sm:hidden sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-2 flex items-center justify-between">
      <Link to="/" className="text-xl font-black">𝕏</Link>
      <Link to="/explore" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
        <Search size={20} />
      </Link>
    </header>
  )
}
