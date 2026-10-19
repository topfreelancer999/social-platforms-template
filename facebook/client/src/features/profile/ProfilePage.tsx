import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProfileStoryAvatar } from '@/features/stories/ProfileStoryAvatar'

export function ProfilePage() {
  const { username } = useParams()
  const { accessToken, user: me } = useAuthStore()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api<{ user: import('@/stores/authStore').User; isSelf: boolean; isFriend: boolean; posts: unknown[] }>(`/users/${username}`, { headers: authHeaders(accessToken) }),
  })
  const addFriend = useMutation({
    mutationFn: (userId: string) =>
      api(`/friends/${userId}/request`, { method: 'POST', headers: authHeaders(accessToken) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })
  if (!data) return <p>Loading...</p>
  const { user, isSelf, isFriend, posts } = data
  return (
    <div>
      <Card className="p-0 overflow-hidden mb-4">
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${user.coverUrl})` }} />
        <div className="px-4 pb-4 -mt-16">
          <ProfileStoryAvatar user={user} />
          <h1 className="text-3xl font-bold mt-2">{user.firstName} {user.lastName}</h1>
          <p className="text-fb-muted">{user.bio}</p>
          {isSelf ? <Link to={`/profile/${username}/edit`}><Button className="mt-3">Edit profile</Button></Link> : (
            <div className="flex gap-2 mt-3">
              {!isFriend && (
                <Button disabled={addFriend.isPending} onClick={() => addFriend.mutate(user.id)}>
                  {addFriend.isPending ? 'Sending…' : 'Add Friend'}
                </Button>
              )}
              <Link to="/messages"><Button variant="secondary">Message</Button></Link>
            </div>
          )}
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Posts</h2>
        {posts.length === 0 && <p className="text-fb-muted text-sm">No posts yet</p>}
        {(posts as { id: string; content: string }[]).map((p) => (
          <p key={p.id} className="text-sm border-b py-2 last:border-0">{p.content}</p>
        ))}
      </Card>
      {isSelf && me && <p className="text-xs text-fb-muted mt-2">Viewing as {me.firstName}</p>}
    </div>
  )
}
