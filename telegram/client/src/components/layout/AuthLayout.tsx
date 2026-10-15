import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--tg-blue)] p-4">
      <div className="mb-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
          ✈️
        </div>
        <h1 className="text-3xl font-bold">Telegram</h1>
        <p className="mt-2 text-white/80">Fast. Secure. Powerful.</p>
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <Outlet />
      </div>
    </div>
  )
}
