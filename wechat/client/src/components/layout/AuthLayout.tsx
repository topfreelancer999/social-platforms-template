import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-wx-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-wx-panel rounded-lg shadow p-6">
        <p className="text-center text-2xl font-medium text-wx-green mb-6">WeChat</p>
        <Outlet />
      </div>
    </div>
  )
}
