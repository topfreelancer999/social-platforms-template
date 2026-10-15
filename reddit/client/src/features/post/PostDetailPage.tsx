import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VoteButtons } from '@/components/posts/VoteButtons'
import { rel } from '@/lib/format'

type Comment = {
  id: string
  content: string
  score: number
  myVote: number
  createdAt: string
  author: { username: string; displayName?: string; firstName: string }
  replies: Comment[]
}

export function PostDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const { data } = useQuery({
    queryKey: ['post', id],
    queryFn: () =>
      api<{ post: { id: string; title: string; body: string; imageUrl?: string; score: number; myVote: number; subreddit: { slug: string; name: string }; author: { username: string } }; comments: Comment[] }>(
        `/posts/${id}`,
        { headers: authHeaders(token!) },
      ),
    enabled: !!id && !!token,
  })

  const votePost = useMutation({
    mutationFn: (value: number) =>
      api(`/posts/${id}/vote`, { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ value }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post', id] }),
  })

  const addComment = useMutation({
    mutationFn: () =>
      api(`/posts/${id}/comments`, { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ content: text }) }),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['post', id] }) },
  })

  const voteComment = useMutation({
    mutationFn: ({ commentId, value }: { commentId: string; value: number }) =>
      api(`/posts/comments/${commentId}/vote`, { method: 'POST', headers: authHeaders(token!), body: JSON.stringify({ value }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post', id] }),
  })

  if (!data) return <p className="text-rd-muted">Loading...</p>
  const { post, comments } = data

  function CommentRow({ c, depth = 0 }: { c: Comment; depth?: number }) {
    return (
      <div className={`${depth > 0 ? 'ml-6 border-l-2 border-rd-border pl-3' : ''} py-2`}>
        <div className="flex gap-2">
          <VoteButtons
            score={c.score}
            myVote={c.myVote}
            onVote={(v) => voteComment.mutate({ commentId: c.id, value: v })}
            layout="horizontal"
          />
          <div>
            <p className="text-xs text-rd-muted">
              u/{c.author.username} · {rel(c.createdAt)}
            </p>
            <p className="text-sm mt-1">{c.content}</p>
          </div>
        </div>
        {c.replies?.map((r) => <CommentRow key={r.id} c={r} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div>
      <article className="bg-rd-card border border-rd-border rounded-lg flex overflow-hidden mb-4">
        <VoteButtons score={post.score} myVote={post.myVote} onVote={(v) => votePost.mutate(v)} />
        <div className="p-4 flex-1">
          <p className="text-xs text-rd-muted mb-2">
            <Link to={`/r/${post.subreddit.slug}`} className="font-semibold hover:underline">r/{post.subreddit.name}</Link>
            {' · '}Posted by u/{post.author.username}
          </p>
          <h1 className="text-2xl font-medium mb-3">{post.title}</h1>
          {post.body && <p className="text-sm whitespace-pre-wrap mb-3">{post.body}</p>}
          {post.imageUrl && <img src={post.imageUrl} alt="" className="rounded border border-rd-border max-w-full" />}
        </div>
      </article>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What are your thoughts?"
          className="w-full border border-rd-border rounded p-3 text-sm min-h-[80px] outline-none focus:border-rd-blue"
        />
        <button
          type="button"
          onClick={() => text.trim() && addComment.mutate()}
          className="mt-2 bg-rd-blue text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:opacity-90"
        >
          Comment
        </button>
      </div>
      <div className="bg-rd-card border border-rd-border rounded-lg p-4">
        {comments.map((c) => <CommentRow key={c.id} c={c} />)}
        {comments.length === 0 && <p className="text-rd-muted text-sm">No comments yet</p>}
      </div>
    </div>
  )
}
