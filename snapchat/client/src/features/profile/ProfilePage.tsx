import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Camera } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { timeLeft } from '@/lib/format'
import type { Streak } from '@/lib/snaps'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

type Friendship =
  | {
      status: 'FRIENDS'
      since: string
      streak: Streak | null
      snapsSent: number
      snapsReceived: number
    }
  | { status: 'REQUESTED' | 'INCOMING' }

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data, isError, error } = useQuery({
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
        friendship: Friendship | null
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  const addFriend = useMutation({
    mutationFn: (userId: string) =>
      api(`/friends/${userId}`, { method: 'POST', headers: authHeaders(token!), body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })

  if (isError) return <p className="p-4 text-red-300">Couldn't load profile: {error.message}</p>
  if (!data) return <p className="p-4 text-white/60">Loading…</p>
  const { user, isSelf, storyCount, friendship } = data
  const name = user.displayName || user.username

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <img
          src={user.bitmojiUrl || user.avatarUrl}
          alt=""
          className="mb-3 h-24 w-24 rounded-full border-4 border-[var(--sc-yellow)] object-cover"
        />
        <h1 className="text-2xl font-bold">{name}</h1>
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
        {!isSelf && me && !friendship && (
          <Button
            className="mt-4 bg-[var(--sc-yellow)] text-black"
            onClick={() => addFriend.mutate(user.id)}
            disabled={addFriend.isPending}
          >
            Add Friend
          </Button>
        )}
        {friendship?.status === 'REQUESTED' && <p className="mt-4 text-sm text-white/60">Friend request sent</p>}
        {friendship?.status === 'INCOMING' && (
          <Link to="/friends" className="mt-4 text-sm font-semibold text-[var(--sc-yellow)]">
            Respond to friend request
          </Link>
        )}
      </div>

      {friendship?.status === 'FRIENDS' && (
        <section aria-label="Friendship" className="mb-4 rounded-xl bg-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/70">Friendship</h2>
          <StreakDetails streak={friendship.streak} name={name} />
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-black/30 p-2">
              <dt className="text-white/50">Friends since</dt>
              <dd className="mt-0.5 font-semibold">{format(new Date(friendship.since), 'MMM yyyy')}</dd>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <dt className="text-white/50">Snaps sent</dt>
              <dd className="mt-0.5 font-semibold">{friendship.snapsSent}</dd>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <dt className="text-white/50">Received</dt>
              <dd className="mt-0.5 font-semibold">{friendship.snapsReceived}</dd>
            </div>
          </dl>
          <Link
            to={`/snap/new?to=${user.id}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[var(--sc-blue)] px-4 py-2.5 text-sm font-semibold"
          >
            <Camera size={18} /> Send a Snap
          </Link>
        </section>
      )}

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

function StreakDetails({ streak, name }: { streak: Streak | null; name: string }) {
  if (!streak) {
    return (
      <p className="text-sm text-white/70">
        No Snapstreak yet. Snap each other 3 days in a row to start one with {name}.
      </p>
    )
  }
  if (!streak.visible) {
    return (
      <p className="text-sm text-white/70">
        Day {streak.count} of 3 — keep snapping each other daily to start a Snapstreak 🔥
      </p>
    )
  }
  return (
    <div>
      <p className="text-lg font-bold">
        🔥 {streak.count} day Snapstreak {streak.milestone}
      </p>
      <p className="text-sm text-white/60">Started on {format(new Date(streak.startedAt), 'MMMM d, yyyy')}</p>
      {streak.hourglass ? (
        <p className="mt-2 rounded-lg bg-amber-400/15 px-3 py-2 text-sm text-amber-200">
          ⌛ Your Snapstreak ends in {timeLeft(streak.expiresAt)} — send a Snap to keep it!
        </p>
      ) : (
        <p className="mt-2 text-xs text-white/50">Snap each other within {timeLeft(streak.expiresAt)} to keep it going.</p>
      )}
    </div>
  )
}
