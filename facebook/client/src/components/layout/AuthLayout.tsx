import { Outlet, Link } from 'react-router-dom'
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-fb-bg flex flex-col">
      <header className="p-4"><Link to="/" className="text-fb-primary font-bold text-4xl">facebook</Link></header>
      <main className="flex-1 flex items-center justify-center p-4"><Outlet /></main>
    </div>
  )
}
