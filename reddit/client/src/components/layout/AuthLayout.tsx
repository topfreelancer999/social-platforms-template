import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-rd-bg flex flex-col items-center justify-center p-4">
      <Link to="/" className="flex items-center gap-2 mb-6">
        <span className="w-10 h-10 rounded-full bg-rd-orange flex items-center justify-center text-white font-bold text-xl">r</span>
        <span className="text-2xl font-bold text-rd-orange">reddit</span>
      </Link>
      <Outlet />
    </div>
  )
}
