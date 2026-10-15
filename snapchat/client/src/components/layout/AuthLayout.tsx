import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="mb-6 flex items-center gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-black"
          style={{ background: 'var(--sc-yellow)' }}
        >
          👻
        </span>
        <span className="text-2xl font-bold" style={{ color: 'var(--sc-yellow)' }}>
          Snapchat
        </span>
      </div>
      <Outlet />
    </div>
  )
}
