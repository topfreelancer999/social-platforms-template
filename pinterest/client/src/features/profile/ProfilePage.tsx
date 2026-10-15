import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PinCard, type PinItem } from '@/components/pins/PinCard'
import { Button } from '@/components/ui/Button'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; displayName?: string; bio: string; website: string; avatarUrl: string }
        stats: { pinCount: number; boardCount: number; followerCount: number; followingCount: number }
        isSelf: boolean
        isFollowing: boolean
        boards: { id: string; name: string; coverUrl: string | null; pinCount: number }[]
        pins: PinItem[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  const follow = useMutation({
    mutationFn: () =>
      api(`/follows/${data!.user.id}`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
    onSuccess: () => window.location.reload(),
  })

  if (!data) return <p className="text-[var(--pin-gray)]">Loading…</p>
  const { user, stats, isSelf, isFollowing, boards, pins } = data

  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6">
        <img src={user.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{user.displayName || user.username}</h1>
          <p className="text-[var(--pin-gray)]">@{user.username}</p>
          {user.bio && <p className="mt-2">{user.bio}</p>}
          {user.website && (
            <a href={user.website} className="mt-1 text-sm text-[var(--pin-red)] hover:underline" target="_blank" rel="noreferrer">
              {user.website}
            </a>
          )}
          <p className="mt-3 text-sm">
            <span className="font-bold">{stats.pinCount}</span> pins ·{' '}
            <span className="font-bold">{stats.followerCount}</span> followers ·{' '}
            <span className="font-bold">{stats.followingCount}</span> following
          </p>
          {isSelf ? (
            <Link to={`/profile/${username}/edit`} className="mt-3 inline-block rounded-full bg-[#efefef] px-4 py-2 text-sm font-semibold">
              Edit profile
            </Link>
          ) : (
            !isFollowing && (
              <Button
                className="mt-3 rounded-full bg-[var(--pin-red)] text-white"
                onClick={() => follow.mutate()}
              >
                Follow
              </Button>
            )
          )}
        </div>
      </div>

      <h2 className="mb-3 text-xl font-bold">Boards</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {boards.map((b) => (
          <Link key={b.id} to={`/board/${b.id}`} className="group overflow-hidden rounded-2xl border border-[var(--pin-border)]">
            <div className="aspect-square bg-[#efefef]">
              {b.coverUrl && <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <p className="p-2 text-sm font-semibold">{b.name}</p>
            <p className="px-2 pb-2 text-xs text-[var(--pin-gray)]">{b.pinCount} pins</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Created pins</h2>
      <div className="masonry">
        {pins.map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </div>
    </div>
  )
}
