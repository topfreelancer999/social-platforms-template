import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-wa-panel flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <p className="text-center text-3xl mb-8 text-wa-teal" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
          WhatsApp
        </p>
        <Outlet />
      </div>
    </div>
  )
}
