import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Hash } from 'lucide-react'

export function RightRail() {
  const token = useAuthStore((s) => s.accessToken)
  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api<{ tag: string; tweetCount: number }[]>('/trending', { headers: authHeaders(token) }),
  })
  const { data: follows } = useQuery({
    queryKey: ['follows'],
    queryFn: () => api<{ suggestions: { id: string; username: string; firstName: string; lastName: string }[] }>('/follows', { headers: authHeaders(token) }),
  })
  return (
    <aside className="hidden lg:block w-[350px] shrink-0 p-4 space-y-4 sticky top-0 self-start">
      <div className="bg-[#f7f9f9] dark:bg-[#16181c] rounded-2xl overflow-hidden">
        <h2 className="font-bold text-xl p-4">Trending</h2>
        {trending?.map((h) => (
          <Link
            key={h.tag}
            to={`/hashtag/${h.tag}`}
            className="block px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <p className="text-xs text-x-muted flex items-center gap-1"><Hash size={12} /> Trending</p>
            <p className="font-bold">#{h.tag}</p>
            <p className="text-xs text-x-muted">{h.tweetCount} posts</p>
          </Link>
        ))}
      </div>
      <div className="bg-[#f7f9f9] dark:bg-[#16181c] rounded-2xl p-4">
        <h2 className="font-bold text-xl mb-3">Who to follow</h2>
        {follows?.suggestions?.slice(0, 3).map((u) => (
          <Link key={u.id} to={`/profile/${u.username}`} className="block py-2 hover:underline">
            <p className="font-bold text-sm">{u.firstName} {u.lastName}</p>
            <p className="text-x-muted text-sm">@{u.username}</p>
          </Link>
        ))}
        <Link to="/follows" className="text-x-primary text-sm mt-2 inline-block">Show more</Link>
      </div>
      <div className="text-xs text-x-muted px-2 space-x-2">
        <Link to="/feedback">Feedback</Link>
        <Link to="/events">Events</Link>
        <Link to="/settings">Settings</Link>
      </div>
    </aside>
  )
}
