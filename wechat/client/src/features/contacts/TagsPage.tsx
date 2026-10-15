import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { displayName, useTags } from './api'

export function TagsPage() {
  const { data, isLoading, isError } = useTags()

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <Link to="/contacts" className="absolute left-3 text-wx-text text-sm">←</Link>
        <h1 className="font-medium">Tags</h1>
        <Link to="/contacts/tags/new" className="absolute right-3 text-wx-green" aria-label="New tag">
          <Plus size={22} />
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-wx-muted">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-500">Could not load tags.</p>}
        {data && data.tags.length === 0 && (
          <div className="p-8 text-center text-sm text-wx-muted">
            <p>No tags yet.</p>
            <p className="mt-1">Group contacts with tags like “Family” to share Moments with just them.</p>
            <Link to="/contacts/tags/new" className="inline-block mt-4 bg-wx-green text-white px-4 py-2 rounded">
              New Tag
            </Link>
          </div>
        )}
        {data && data.tags.length > 0 && (
          <div className="bg-wx-panel mt-2">
            {data.tags.map((t) => (
              <Link
                key={t.id}
                to={`/contacts/tags/${t.id}`}
                className="block px-4 py-3 border-b border-wx-border hover:bg-wx-bg"
              >
                <p className="text-[15px]">
                  {t.name} <span className="text-wx-muted">({t.memberCount})</span>
                </p>
                <p className="text-xs text-wx-muted truncate mt-0.5">
                  {t.members.map(displayName).join(', ') || 'No members'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
