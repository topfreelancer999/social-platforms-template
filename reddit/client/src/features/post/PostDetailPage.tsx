import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VoteButtons } from '@/components/posts/VoteButtons'
import type { RedditPost } from '@/components/posts/PostCard'
import { useWatchPost } from '@/features/votes/useLiveVotes'
import { rel } from '@/lib/format'
import { CommentThread, type PostComment } from './CommentThread'

const COMMENT_SORTS = [
  { id: 'best', label: 'Best' },
  { id: 'top', label: 'Top' },
  { id: 'new', label: 'New' },
  { id: 'controversial', label: 'Controversial' },
  { id: 'old', label: 'Old' },
] as const
type CommentSort = (typeof COMMENT_SORTS)[number]['id']

/** Share of votes that are upvotes, as Reddit shows under a post. */
function upvoteRatio(post: RedditPost) {
  const total = post.upvotes + post.downvotes
  return total === 0 ? null : Math.round((post.upvotes / total) * 100)
}

export function PostDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [sort, setSort] = useState<CommentSort>('best')
  useWatchPost(id)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['post', id, sort],
    queryFn: () =>
      api<{ post: RedditPost; comments: PostComment[] }>(`/posts/${id}?sort=${sort}`, { headers: authHeaders(token!) }),
    enabled: !!id && !!token,
    placeholderData: (prev) => prev,
  })

  const addComment = useMutation({
    mutationFn: () =>
      api(`/posts/${id}/comments?sort=${sort}`, { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ content: text }) }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  if (isLoading) return <p className="text-rd-muted">Loading...</p>
  if (isError || !data) return <p className="text-rd-muted">{error?.message === 'Not found' ? 'Post not found.' : "Couldn't load this post."}</p>
  const { post, comments } = data
  const ratio = upvoteRatio(post)

  return (
    <div>
      <article className="bg-rd-card border border-rd-border rounded-lg flex overflow-hidden mb-4">
        <VoteButtons kind="post" target={post} />
        <div className="p-4 flex-1 min-w-0">
          <p className="text-xs text-rd-muted mb-2">
            <Link to={`/r/${post.subreddit.slug}`} className="font-semibold hover:underline">r/{post.subreddit.name}</Link>
            {' · '}Posted by{' '}
            <Link to={`/profile/${post.author.username}`} className="hover:underline">u/{post.author.username}</Link>
            {' · '}
            {rel(post.createdAt)}
          </p>
          <h1 className="text-2xl font-medium mb-3 break-words">{post.title}</h1>
          {post.body && <p className="text-sm whitespace-pre-wrap mb-3 break-words">{post.body}</p>}
          {post.imageUrl && <img src={post.imageUrl} alt="" className="rounded border border-rd-border max-w-full mb-3" />}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-rd-muted">
            <span className="flex items-center gap-1">
              <MessageSquare size={16} /> {post.commentCount} Comments
            </span>
            {ratio !== null && <span>{ratio}% upvoted</span>}
          </p>
        </div>
      </article>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What are your thoughts?"
          aria-label="Comment"
          className="w-full border border-rd-border rounded p-3 text-sm min-h-[80px] outline-none focus:border-rd-blue"
        />
        {addComment.isError && <p className="text-sm text-red-600 mt-1">{addComment.error.message}</p>}
        <button
          type="button"
          disabled={addComment.isPending}
          onClick={() => text.trim() && addComment.mutate()}
          className="mt-2 bg-rd-blue text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-60"
        >
          {addComment.isPending ? 'Posting...' : 'Comment'}
        </button>
      </div>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-rd-muted mb-2">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CommentSort)}
            className="bg-transparent text-rd-text font-semibold border border-rd-border rounded px-2 py-1 outline-none focus:border-rd-blue"
          >
            {COMMENT_SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        {comments.map((c) => <CommentThread key={c.id} comment={c} />)}
        {comments.length === 0 && <p className="text-rd-muted text-sm">No comments yet</p>}
      </div>
    </div>
  )
}
