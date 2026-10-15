import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid3X3 } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; displayName?: string; firstName: string; lastName: string; bio: string; avatarUrl: string; verified?: boolean }
        isFollowing: boolean
        isSelf: boolean
        stats: { posts: number; followers: number; following: number }
        grid: { id: string; imageUrl: string | null; likeCount: number }[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  const follow = useMutation({
    mutationFn: async () => {
      if (!data) return
      if (data.isFollowing) {
        await api(`/follows/${data.user.id}`, { method: 'DELETE', headers: authHeaders(token!) })
      } else {
        await api(`/follows/${data.user.id}`, { method: 'POST', headers: authHeaders(token!) })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })

  if (!data) return <p className="text-center text-ig-muted py-8">Loading...</p>
  const { user, stats, grid, isSelf, isFollowing } = data

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        <img src={user.avatarUrl} alt="" className="w-36 h-36 rounded-full object-cover mx-auto sm:mx-0" />
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h1 className="text-xl flex items-center gap-1">
              {user.username}
              {user.verified && <span className="text-ig-blue">✓</span>}
            </h1>
            {isSelf ? (
              <Link to={`/profile/${username}/edit`} className="px-4 py-1.5 bg-ig-surface border border-ig-border rounded-lg text-sm font-semibold">
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => follow.mutate()}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${isFollowing ? 'bg-ig-surface border border-ig-border' : 'bg-ig-blue text-white'}`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="flex gap-8 text-base mb-4">
            <span><b>{stats.posts}</b> posts</span>
            <span><b>{stats.followers.toLocaleString()}</b> followers</span>
            <span><b>{stats.following}</b> following</span>
          </div>
          <p className="font-semibold">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
          {user.bio && <p className="text-sm whitespace-pre-line">{user.bio}</p>}
        </div>
      </div>
      <div className="border-t border-ig-border mt-6 flex justify-center gap-8 text-xs font-semibold tracking-widest uppercase text-ig-muted">
        <span className="flex items-center gap-1 py-3 border-t border-white -mt-px text-white">
          <Grid3X3 size={12} /> Posts
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-1">
        {grid.map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className="relative aspect-square group">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-semibold">
              ♥ {p.likeCount}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
