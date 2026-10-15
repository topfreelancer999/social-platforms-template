import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { BottomNav } from '@/components/layout/BottomNav'
import type { VideoItem } from '@/features/feed/types'

export function ProfilePage() {
  const { username } = useParams()
  const { accessToken, user: me } = useAuthStore()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string; bio: string; verified?: boolean }
        isFollowing: boolean
        isSelf: boolean
        followerCount: number
        followingCount: number
        videos: VideoItem[]
      }>(`/users/${username}`, { headers: authHeaders(accessToken) }),
  })
  const follow = useMutation({
    mutationFn: (id: string) => api(`/follows/${id}`, { method: 'POST', headers: authHeaders(accessToken) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })
  if (!data) return <div className="bg-black min-h-screen text-white p-4">Loading…</div>
  const { user, isSelf, isFollowing, videos, followerCount, followingCount } = data
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <div className="p-4 flex flex-col items-center">
        <Avatar src={user.avatarUrl} size="lg" className="w-24 h-24" />
        <h1 className="font-bold text-lg mt-2">@{user.username}</h1>
        <p className="text-sm text-tt-muted text-center">{user.bio}</p>
        <div className="flex gap-6 mt-3 text-sm">
          <span><b>{followingCount}</b> Following</span>
          <span><b>{followerCount}</b> Followers</span>
        </div>
        {isSelf ? (
          <Link to={`/@${username}/edit`} className="mt-4 px-8 py-2 border border-white/30 rounded font-semibold text-sm">Edit profile</Link>
        ) : (
          !isFollowing && (
            <button type="button" onClick={() => follow.mutate(user.id)} className="mt-4 px-8 py-2 bg-tt-primary rounded font-semibold text-sm">
              Follow
            </button>
          )
        )}
        <div className="flex gap-4 mt-4 text-sm">
          <Link to="/channel" className="text-tt-secondary">Channel</Link>
          <Link to="/groups" className="text-tt-secondary">Communities</Link>
          <Link to="/settings" className="text-tt-secondary">Settings</Link>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {videos.map((v) => (
          <Link key={v.id} to={`/video/${v.id}`} className="aspect-[9/16] bg-white/10 overflow-hidden">
            <img src={v.coverUrl} alt="" className="w-full h-full object-cover" />
          </Link>
        ))}
      </div>
      {isSelf && me && <p className="text-center text-xs text-tt-muted p-4">Logged in as {me.firstName}</p>}
      <BottomNav active="profile" />
    </div>
  )
}
