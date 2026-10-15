import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TweetCard } from '@/features/feed/TweetCard'
import type { Tweet } from '@/features/feed/types'

export function ProfilePage() {
  const { username } = useParams()
  const { accessToken, user: me } = useAuthStore()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: import('@/stores/authStore').User & { verified?: boolean }
        isSelf: boolean
        isFollowing: boolean
        followerCount: number
        followingCount: number
        tweets: Tweet[]
      }>(`/users/${username}`, { headers: authHeaders(accessToken) }),
  })
  const follow = useMutation({
    mutationFn: (userId: string) => api(`/follows/${userId}`, { method: 'POST', headers: authHeaders(accessToken) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })
  if (!data) return <p className="p-4">Loading…</p>
  const { user, isSelf, isFollowing, tweets, followerCount, followingCount } = data
  return (
    <div>
      <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${user.coverUrl})` }} />
      <div className="px-4 pb-4 -mt-12 flex justify-between items-end">
        <Avatar src={user.avatarUrl} size="lg" className="border-4 border-white dark:border-black w-24 h-24" />
        {isSelf ? (
          <Link to={`/profile/${username}/edit`}>
            <Button variant="secondary" className="rounded-full">Edit profile</Button>
          </Link>
        ) : (
          <div className="flex gap-2">
            {!isFollowing && (
              <Button className="rounded-full" disabled={follow.isPending} onClick={() => follow.mutate(user.id)}>
                Follow
              </Button>
            )}
            <Link to="/messages"><Button variant="secondary" className="rounded-full">Message</Button></Link>
          </div>
        )}
      </div>
      <div className="px-4">
        <h1 className="text-xl font-bold flex items-center gap-1">
          {user.firstName} {user.lastName}
          {user.verified && <span className="text-x-primary text-sm">✓</span>}
        </h1>
        <p className="text-x-muted">@{user.username}</p>
        <p className="mt-2 text-[15px]">{user.bio}</p>
        <p className="text-x-muted text-sm mt-2">
          <span className="text-x-text-light dark:text-x-text font-bold">{followingCount}</span> Following{' '}
          <span className="text-x-text-light dark:text-x-text font-bold ml-3">{followerCount}</span> Followers
        </p>
      </div>
      <div className="border-t border-x-border-light dark:border-x-border mt-4">
        {tweets.map((t) => (
          <TweetCard key={t.entryId ?? t.id} tweet={t} />
        ))}
        {tweets.length === 0 && <p className="p-4 text-x-muted text-sm">No posts yet</p>}
      </div>
      {isSelf && me && <p className="text-xs text-x-muted p-4">Viewing as {me.firstName}</p>}
    </div>
  )
}
