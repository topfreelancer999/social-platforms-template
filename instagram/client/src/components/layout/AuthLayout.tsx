import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-ig-bg text-ig-text flex flex-col items-center justify-center p-4">
      <Link to="/" className="text-4xl mb-8" style={{ fontFamily: 'cursive' }}>
        Instagram
      </Link>
      <Outlet />
    </div>
  )
}
