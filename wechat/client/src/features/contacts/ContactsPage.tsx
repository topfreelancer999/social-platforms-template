import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { displayName, useContacts } from './api'

export function ContactsPage() {
  const { data, isLoading, isError } = useContacts()

  return (
    <div className="h-full flex flex-col bg-wx-header">
      <header className="h-14 px-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Contacts</h1>
        <Link to="/contacts/new" className="text-wx-green text-sm font-medium">New chat</Link>
      </header>
      <div className="flex-1 overflow-y-auto">
        <Link to="/contacts/tags" className="flex items-center gap-3 px-4 py-3 bg-wx-panel border-b border-wx-border hover:bg-wx-bg">
          <span className="w-12 h-12 rounded bg-blue-500 text-white flex items-center justify-center">
            <Tag size={22} />
          </span>
          <span className="font-medium">Tags</span>
        </Link>
        {isLoading && <p className="px-4 py-3 text-sm text-wx-muted">Loading…</p>}
        {isError && <p className="px-4 py-3 text-sm text-red-500">Could not load contacts.</p>}
        {data && data.contacts.length === 0 && (
          <p className="px-4 py-6 text-sm text-wx-muted text-center">
            No contacts yet. Use <Link to="/search" className="text-wx-green">Search</Link> to find people.
          </p>
        )}
        {data?.contacts.map((c) => (
          <Link
            key={c.id}
            to={`/profile/${c.username}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-wx-border/40"
          >
            <img src={c.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
            <div className="min-w-0">
              <p className="font-medium">{displayName(c)}</p>
              <p className="text-sm text-wx-muted truncate">
                {c.tags.length > 0 ? c.tags.map((t) => t.name).join(', ') : c.phone || `@${c.username}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
