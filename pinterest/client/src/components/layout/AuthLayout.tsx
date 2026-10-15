import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--pin-red)] text-2xl font-bold text-white">
          P
        </span>
        <span className="text-3xl font-bold text-[var(--pin-red)]">Pinterest</span>
      </div>
      <Outlet />
    </div>
  )
}
