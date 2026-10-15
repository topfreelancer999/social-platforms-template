import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { username: string; displayName?: string; karma: number; bio: string; avatarUrl: string }
        isSelf: boolean
        posts: RedditPost[]
        subreddits: { slug: string; name: string; iconUrl: string }[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  if (!data) return <p className="text-rd-muted">Loading...</p>
  const { user, posts, isSelf, subreddits } = data

  return (
    <div>
      <div className="bg-rd-card border border-rd-border rounded-lg p-6 mb-4 flex gap-4">
        <img src={user.avatarUrl} alt="" className="w-20 h-20 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">u/{user.username}</h1>
          <p className="text-rd-orange font-semibold">{user.karma?.toLocaleString() ?? 0} karma</p>
          {user.bio && <p className="text-sm mt-2">{user.bio}</p>}
          {isSelf && (
            <Link to={`/profile/${username}/edit`} className="text-sm text-rd-blue font-semibold mt-2 inline-block">
              Edit profile
            </Link>
          )}
        </div>
      </div>
      {subreddits.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Joined communities</h2>
          <div className="flex flex-wrap gap-2">
            {subreddits.map((s) => (
              <Link key={s.slug} to={`/r/${s.slug}`} className="text-sm bg-rd-card border border-rd-border rounded-full px-3 py-1 hover:border-rd-orange">
                r/{s.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <h2 className="font-semibold mb-3">Posts</h2>
      {posts.map((p) => <PostCard key={p.id} post={p} compact />)}
    </div>
  )
}
