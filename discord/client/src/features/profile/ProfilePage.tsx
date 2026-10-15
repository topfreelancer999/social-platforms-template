import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { username: string; displayName?: string; firstName: string; lastName: string; bio: string; avatarUrl: string; coverUrl: string; status?: string }
        isSelf: boolean
        posts: { id: string; content: string; createdAt: string }[]
        servers: { id: string; name: string; iconUrl: string }[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })
  if (!data) return <p className="text-dc-muted">Loading profile...</p>
  const { user, posts, servers, isSelf } = data
  return (
    <div className="max-w-2xl">
      <img src={user.coverUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
      <div className="flex gap-4 -mt-8 px-4">
        <img src={user.avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-dc-bg" />
        <div className="pt-10">
          <h1 className="text-xl font-bold">{user.displayName || `${user.firstName} ${user.lastName}`}</h1>
          <p className="text-dc-muted">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
          {isSelf && (
            <Link to={`/users/${username}/edit`} className="inline-block mt-2 text-dc-blurple text-sm font-semibold">
              Edit profile
            </Link>
          )}
        </div>
      </div>
      {servers.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Servers</h2>
          <div className="flex flex-wrap gap-2">
            {servers.map((s) => (
              <Link key={s.id} to={`/servers/${s.id}`} className="flex items-center gap-2 bg-dc-sidebar px-3 py-2 rounded-lg text-sm hover:bg-dc-hover">
                <img src={s.iconUrl} alt="" className="w-8 h-8 rounded-full" />
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-6 space-y-3">
        <h2 className="font-semibold">Posts</h2>
        {posts.map((p) => (
          <div key={p.id} className="bg-dc-sidebar rounded-lg p-4">
            <p>{p.content}</p>
            <p className="text-xs text-dc-muted mt-2">{rel(p.createdAt)}</p>
          </div>
        ))}
        {posts.length === 0 && <p className="text-dc-muted text-sm">No posts yet.</p>}
      </section>
    </div>
  )
}
