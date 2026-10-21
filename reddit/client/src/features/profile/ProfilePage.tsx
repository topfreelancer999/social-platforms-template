import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'
import { formatScore, rel } from '@/lib/format'
import { PostCard, type RedditPost } from '@/components/posts/PostCard'
import { VoteButtons } from '@/components/posts/VoteButtons'
import type { Votable } from '@/features/votes/voteCache'

type ProfileComment = Votable & {
  content: string
  createdAt: string
  post: { id: string; title: string; subreddit: { slug: string; name: string } }
}

type Tab = 'posts' | 'comments' | 'upvoted' | 'downvoted'

const EMPTY: Record<Tab, string> = {
  posts: 'No posts yet',
  comments: 'No comments yet',
  upvoted: "You haven't upvoted anything yet",
  downvoted: "You haven't downvoted anything yet",
}

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const [params, setParams] = useSearchParams()
  const { data, isError } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { username: string; displayName?: string; karma: number; postKarma: number; commentKarma: number; bio: string; avatarUrl: string; createdAt: string }
        isSelf: boolean
        posts: RedditPost[]
        subreddits: { slug: string; name: string; iconUrl: string }[]
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })
  const isSelf = data?.isSelf ?? false
  const requested = (params.get('tab') ?? 'posts') as Tab
  // Upvoted/Downvoted are private to the profile owner, as on Reddit.
  const tab: Tab = requested in EMPTY && (isSelf || requested === 'posts' || requested === 'comments') ? requested : 'posts'
  const tabQuery = useQuery({
    queryKey: ['profile-tab', username, tab],
    queryFn: () =>
      api<{ posts?: RedditPost[]; comments?: ProfileComment[] }>(`/users/${username}/${tab}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token && !!data && tab !== 'posts',
  })

  if (isError) return <p className="text-rd-muted">Couldn't load this profile.</p>
  if (!data) return <p className="text-rd-muted">Loading...</p>
  const { user, posts, subreddits } = data
  const tabs: Tab[] = isSelf ? ['posts', 'comments', 'upvoted', 'downvoted'] : ['posts', 'comments']
  const listPosts = tab === 'posts' ? posts : tabQuery.data?.posts
  const listComments = tab === 'comments' ? tabQuery.data?.comments : undefined

  return (
    <div>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4 sm:p-6 mb-4">
        <div className="flex gap-4">
          <img src={user.avatarUrl} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{user.displayName || user.username}</h1>
            <p className="text-sm text-rd-muted">
              u/{user.username} · <span className="text-rd-orange font-semibold">{formatScore(user.karma)} karma</span>
            </p>
            {user.bio && <p className="text-sm mt-2">{user.bio}</p>}
            {isSelf && (
              <Link to={`/profile/${username}/edit`} className="text-sm text-rd-blue font-semibold mt-2 inline-block">
                Edit profile
              </Link>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-rd-border text-center">
          {[
            { label: 'Post karma', value: user.postKarma },
            { label: 'Comment karma', value: user.commentKarma },
            { label: 'Total karma', value: user.karma },
          ].map((k) => (
            <div key={k.label} className="flex flex-col-reverse">
              <dt className="text-xs text-rd-muted">{k.label}</dt>
              <dd className="text-lg font-bold tabular-nums" title={k.value.toLocaleString()}>{formatScore(k.value)}</dd>
            </div>
          ))}
        </dl>
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
      <div role="tablist" aria-label="Profile sections" className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'posts' ? {} : { tab: t }, { replace: true })}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-semibold capitalize shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-rd-blue',
              tab === t ? 'bg-rd-text text-white' : 'text-rd-muted hover:bg-rd-card',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab !== 'posts' && tabQuery.isLoading && <p className="text-rd-muted text-sm py-4">Loading...</p>}
      {tab !== 'posts' && tabQuery.isError && <p className="text-rd-muted text-sm py-4">{tabQuery.error.message}</p>}
      {listPosts?.map((p) => <PostCard key={p.id} post={p} compact />)}
      {listComments?.map((c) => (
        <div key={c.id} className="bg-rd-card border border-rd-border rounded-lg p-3 mb-2">
          <p className="text-xs text-rd-muted mb-1 break-words">
            <span className="font-semibold text-rd-text">u/{user.username}</span> commented on{' '}
            <Link to={`/post/${c.post.id}`} className="font-semibold text-rd-text hover:underline">{c.post.title}</Link>
            {' · '}
            <Link to={`/r/${c.post.subreddit.slug}`} className="hover:underline">r/{c.post.subreddit.name}</Link>
            {' · '}
            {rel(c.createdAt)}
          </p>
          <p className="text-sm break-words">{c.content}</p>
          <div className="mt-1 -ml-1">
            <VoteButtons kind="comment" target={c} layout="horizontal" />
          </div>
        </div>
      ))}
      {(listPosts?.length === 0 || listComments?.length === 0) && <p className="text-rd-muted text-sm py-4">{EMPTY[tab]}</p>}
    </div>
  )
}
