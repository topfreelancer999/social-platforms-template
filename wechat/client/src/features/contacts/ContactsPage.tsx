import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function ContactsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api<{ contacts: { id: string; username: string; displayName?: string; firstName: string; avatarUrl: string; phone?: string }[] }>('/contacts', {
      headers: authHeaders(token!),
    }),
    enabled: !!token,
  })

  return (
    <div className="h-full flex flex-col bg-wx-header">
      <header className="h-14 px-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Contacts</h1>
        <Link to="/contacts/new" className="text-wx-green text-sm font-medium">New chat</Link>
      </header>
      <div className="flex-1 overflow-y-auto">
        {data?.contacts.map((c) => (
          <Link
            key={c.id}
            to={`/contacts/new?userId=${c.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-wx-border/40"
          >
            <img src={c.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-medium">{c.displayName || c.firstName}</p>
              <p className="text-sm text-wx-muted">{c.phone || `@${c.username}`}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
