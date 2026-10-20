import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid3X3, Lock, Settings } from 'lucide-react'
import { api, ApiError, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/authStore'
import { ConfirmSheet } from '@/components/ui/Sheet'
import { FollowListSheet } from './FollowListSheet'
import type { FollowList, FollowStatus, ProfileData } from './types'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [openList, setOpenList] = useState<FollowList | null>(null)
  const [confirmUnfollow, setConfirmUnfollow] = useState(false)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api<ProfileData>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  // POST follows public accounts instantly or sends a request to private ones; DELETE unfollows or cancels.
  const follow = useMutation({
    mutationFn: (action: 'follow' | 'unfollow') =>
      api<{ status: FollowStatus }>(`/follows/${data!.user.id}`, {
        method: action === 'follow' ? 'POST' : 'DELETE',
        headers: authHeaders(token!),
      }),
    onSuccess: (res) => {
      setConfirmUnfollow(false)
      qc.setQueryData<ProfileData>(['profile', username], (prev) =>
        prev ? { ...prev, followStatus: res.status, isFollowing: res.status === 'following' } : prev,
      )
      qc.invalidateQueries({ queryKey: ['profile', username] })
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
    },
  })

  if (isLoading) return <p className="text-center text-ig-muted py-8">Loading...</p>
  if (error || !data) {
    const missing = error instanceof ApiError && error.status === 404
    return (
      <div className="text-center py-16 px-4">
        <h1 className="text-xl font-semibold">{missing ? "Sorry, this page isn't available." : "Couldn't load profile"}</h1>
        <p className="text-sm text-ig-muted mt-2">
          {missing ? 'The link you followed may be broken, or the page may have been removed.' : error?.message}
        </p>
        {missing ? (
          <Link to="/" className="inline-block mt-4 text-sm font-semibold text-ig-blue">Go back to Instagram</Link>
        ) : (
          <button type="button" onClick={() => refetch()} className="mt-4 text-sm font-semibold text-ig-blue">Try again</button>
        )}
      </div>
    )
  }
  const { user, stats, grid, isSelf, followStatus, canView } = data

  const onFollowClick = () => {
    if (followStatus === 'none') return follow.mutate('follow')
    if (followStatus === 'requested') return follow.mutate('unfollow')
    // Unfollowing a private account loses access, so Instagram asks first.
    if (user.isPrivate) return setConfirmUnfollow(true)
    follow.mutate('unfollow')
  }
  const followLabel = { following: 'Following', requested: 'Requested', none: 'Follow' }[followStatus]

  const stat = (count: number, label: string, list?: FollowList) => {
    const body = (
      <>
        <b className="block sm:inline font-semibold">{count.toLocaleString()}</b>{' '}
        <span className="text-ig-muted sm:text-ig-text">{count === 1 && label !== 'following' ? label.slice(0, -1) : label}</span>
      </>
    )
    // Lists of private accounts are hidden from non-followers (the API answers 403 too).
    return list && canView ? (
      <button type="button" onClick={() => setOpenList(list)} className="text-center sm:text-left hover:opacity-80">
        {body}
      </button>
    ) : (
      <span className="text-center sm:text-left">{body}</span>
    )
  }

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="flex gap-6 sm:gap-16 items-center sm:items-start">
        <img src={user.avatarUrl} alt="" className="w-20 h-20 sm:w-36 sm:h-36 rounded-full object-cover shrink-0 sm:ml-12" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-4">
            <h1 className="text-xl flex items-center gap-1.5 min-w-0">
              <span className="truncate">{user.username}</span>
              {user.isPrivate && <Lock size={16} aria-label="Private account" className="shrink-0" />}
              {user.verified && <span className="text-ig-blue text-base">✓</span>}
            </h1>
            {isSelf ? (
              <div className="flex items-center gap-2">
                <Link to={`/profile/${username}/edit`} className="px-4 py-1.5 bg-ig-button hover:bg-ig-button-hover rounded-lg text-sm font-semibold">
                  Edit profile
                </Link>
                <Link to="/settings/privacy" aria-label="Settings" className="p-1.5 hover:opacity-70">
                  <Settings size={22} />
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={onFollowClick}
                disabled={follow.isPending}
                className={cn(
                  'px-5 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60',
                  followStatus === 'none' ? 'bg-ig-blue hover:bg-ig-blue-hover text-white' : 'bg-ig-button hover:bg-ig-button-hover',
                )}
              >
                {followLabel}
              </button>
            )}
          </div>
          <div className="hidden sm:flex gap-10 text-base mb-4">
            {stat(stats.posts, 'posts')}
            {stat(stats.followers, 'followers', 'followers')}
            {stat(stats.following, 'following', 'following')}
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold text-sm">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
            {user.bio && <p className="text-sm whitespace-pre-line">{user.bio}</p>}
          </div>
        </div>
      </div>
      {/* Phone layout: name/bio under the avatar, counts in their own row like the app. */}
      <div className="sm:hidden mt-4">
        <p className="font-semibold text-sm">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
        {user.bio && <p className="text-sm whitespace-pre-line">{user.bio}</p>}
      </div>
      <div className="sm:hidden grid grid-cols-3 border-t border-ig-border mt-4 pt-3 text-sm">
        {stat(stats.posts, 'posts')}
        {stat(stats.followers, 'followers', 'followers')}
        {stat(stats.following, 'following', 'following')}
      </div>
      {follow.error && <p role="alert" className="text-sm text-ig-danger mt-3">{follow.error.message}</p>}

      {canView ? (
        <>
          <div className="border-t border-ig-border mt-6 flex justify-center gap-8 text-xs font-semibold tracking-widest uppercase text-ig-muted">
            <span className="flex items-center gap-1 py-3 border-t border-white -mt-px text-white">
              <Grid3X3 size={12} /> Posts
            </span>
          </div>
          {grid.length === 0 ? (
            <p className="text-center text-ig-muted text-sm py-12">No posts yet</p>
          ) : (
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
          )}
        </>
      ) : (
        <div className="border-t border-ig-border mt-6 py-14 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-ig-text flex items-center justify-center">
            <Lock size={28} />
          </div>
          <p className="font-semibold">This account is private</p>
          <p className="text-sm text-ig-muted max-w-xs">
            {followStatus === 'requested'
              ? `You'll see their photos and videos once ${user.username} accepts your request.`
              : 'Follow to see their photos and videos.'}
          </p>
        </div>
      )}

      {openList && (
        <FollowListSheet
          username={user.username}
          list={openList}
          canRemove={isSelf && openList === 'followers'}
          onClose={() => setOpenList(null)}
        />
      )}
      {confirmUnfollow && (
        <ConfirmSheet
          title={`Unfollow ${user.username}?`}
          image={user.avatarUrl}
          confirmLabel="Unfollow"
          destructive
          pending={follow.isPending}
          error={follow.error?.message}
          onConfirm={() => follow.mutate('unfollow')}
          onCancel={() => {
            follow.reset()
            setConfirmUnfollow(false)
          }}
        >
          If you change your mind, you'll have to request to follow {user.username} again.
        </ConfirmSheet>
      )}
    </div>
  )
}
