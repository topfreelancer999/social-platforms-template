import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  Repeat2,
  Send,
  ThumbsUp,
} from 'lucide-react'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative, formatCount } from '@/lib/format'
import { REACTION_LABELS, REACTION_TYPES } from '@/lib/constants'
import type { ReactionType, UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

interface EnrichedPost {
  id: string
  content: string
  imageUrl?: string
  articleUrl?: string
  articleTitle?: string
  createdAt: string
  isSponsored?: boolean
  author: UserPublic | null
  reactions: { userId: string; type: ReactionType }[]
  totalReactions: number
  reactionSummary: Record<string, number>
  comments: { id: string; content: string; author: UserPublic; createdAt: string }[]
  repost?: EnrichedPost
}

export function PostCard({ post }: { post: EnrichedPost }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const queryClient = useQueryClient()

  const react = useMutation({
    mutationFn: (type: ReactionType) =>
      api(`/posts/${post.id}/react`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  })

  const addComment = useMutation({
    mutationFn: () =>
      api(`/posts/${post.id}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: comment }),
      }),
    onSuccess: () => {
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const repost = useMutation({
    mutationFn: () =>
      api(`/posts/${post.id}/repost`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  })

  const myReaction = post.reactions.find((r) => r.userId === user?.id)

  return (
    <Card padding={false} className={post.isSponsored ? 'border-amber-200' : ''}>
      {post.isSponsored && (
        <p className="px-4 pt-3 text-[10px] text-linkedin-muted uppercase">Promoted</p>
      )}
      <div className="p-4">
        {post.author && (
          <div className="flex gap-2 mb-3">
            <Link to={`/in/${post.author.username}`}>
              <Avatar
                src={post.author.avatarUrl}
                name={`${post.author.firstName} ${post.author.lastName}`}
              />
            </Link>
            <div>
              <Link
                to={`/in/${post.author.username}`}
                className="font-semibold text-sm hover:text-linkedin-primary hover:underline"
              >
                {post.author.firstName} {post.author.lastName}
              </Link>
              <p className="text-xs text-linkedin-muted line-clamp-1">{post.author.headline}</p>
              <p className="text-xs text-linkedin-muted">{formatRelative(post.createdAt)}</p>
            </div>
          </div>
        )}
        {post.repost && (
          <Card className="mb-3 bg-linkedin-bg">
            <p className="text-xs text-linkedin-muted mb-2">Reposted</p>
            <p className="text-sm whitespace-pre-wrap">{post.repost.content || '(Repost)'}</p>
          </Card>
        )}
        <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="rounded w-full mb-3 max-h-96 object-cover" />
        )}
        {post.articleUrl && (
          <a
            href={post.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="block border rounded p-3 mb-3 hover:bg-gray-50"
          >
            <p className="font-semibold text-sm">{post.articleTitle ?? 'Article'}</p>
            <p className="text-xs text-linkedin-muted truncate">{post.articleUrl}</p>
          </a>
        )}
        {post.totalReactions > 0 && (
          <p className="text-xs text-linkedin-muted mb-2">
            {formatCount(post.totalReactions)} reactions
          </p>
        )}
        <div className="flex border-t border-b py-1 -mx-4 px-4 relative">
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            {showReactions && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white shadow-lg rounded-full px-2 py-1 border z-10">
                {REACTION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => react.mutate(type)}
                    className="text-xs px-2 py-1 hover:bg-gray-100 rounded"
                    title={REACTION_LABELS[type]}
                  >
                    {type === 'like' ? '👍' : type === 'celebrate' ? '🎉' : type === 'support' ? '💪' : type === 'love' ? '❤️' : type === 'insightful' ? '💡' : '😄'}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => react.mutate('like')}
              className={cn(
                'w-full flex items-center justify-center gap-1 py-2 text-sm text-linkedin-muted hover:bg-gray-100 rounded',
                myReaction && 'text-linkedin-primary font-semibold',
              )}
            >
              <ThumbsUp size={18} />
              {myReaction ? REACTION_LABELS[myReaction.type] : 'Like'}
            </button>
          </div>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-linkedin-muted hover:bg-gray-100 rounded"
          >
            <MessageCircle size={18} /> Comment
          </button>
          <button
            onClick={() => repost.mutate()}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-linkedin-muted hover:bg-gray-100 rounded"
          >
            <Repeat2 size={18} /> Repost
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-linkedin-muted hover:bg-gray-100 rounded">
            <Send size={18} /> Send
          </button>
        </div>
        {showComments && (
          <div className="mt-3 space-y-2">
            {post.comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar src={c.author.avatarUrl} name={`${c.author.firstName} ${c.author.lastName}`} size="sm" />
                <div className="bg-linkedin-bg rounded-lg px-3 py-2 flex-1">
                  <p className="text-xs font-semibold">
                    {c.author.firstName} {c.author.lastName}
                  </p>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 text-sm border rounded-full px-4 py-2"
                onKeyDown={(e) => e.key === 'Enter' && comment.trim() && addComment.mutate()}
              />
              <button
                onClick={() => addComment.mutate()}
                disabled={!comment.trim()}
                className="text-linkedin-primary font-semibold text-sm disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
