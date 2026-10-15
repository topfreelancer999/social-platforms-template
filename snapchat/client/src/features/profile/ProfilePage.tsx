import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: {
          id: string
          username: string
          displayName?: string
          snapScore: number
          bio: string
          avatarUrl: string
          bitmojiUrl?: string
        }
        isSelf: boolean
        storyCount: number
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  const addFriend = useMutation({
    mutationFn: (userId: string) =>
      api(`/friends/${userId}`, { method: 'POST', headers: authHeaders(token!), body: '{}' }),
  })

  if (!data) return <p className="p-4 text-white/60">Loading…</p>
  const { user, isSelf, storyCount } = data

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <img
          src={user.bitmojiUrl || user.avatarUrl}
          alt=""
          className="mb-3 h-24 w-24 rounded-full border-4 border-[var(--sc-yellow)] object-cover"
        />
        <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
        <p className="text-white/60">@{user.username}</p>
        <p className="mt-2 text-[var(--sc-yellow)] font-semibold">🔥 {user.snapScore?.toLocaleString()} Snap Score</p>
        {user.bio && <p className="mt-2 text-sm text-white/80">{user.bio}</p>}
        {storyCount > 0 && (
          <Link to={`/story/${user.username}`} className="mt-3 text-sm text-[var(--sc-blue)]">
            View Story ({storyCount})
          </Link>
        )}
        {isSelf && (
          <Link to={`/profile/${username}/edit`} className="mt-3 text-sm text-white/70 underline">
            Edit profile
          </Link>
        )}
        {!isSelf && me && (
          <Button
            className="mt-4 bg-[var(--sc-yellow)] text-black"
            onClick={() => addFriend.mutate(user.id)}
            disabled={addFriend.isPending}
          >
            Add Friend
          </Button>
        )}
      </div>
      <div className="grid gap-2 text-sm">
        <Link to="/settings" className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
          Settings
        </Link>
        <Link to="/feedback" className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
          Feedback & reviews
        </Link>
      </div>
    </div>
  )
}
