import { Link } from 'react-router-dom'
import { VoteButtons } from '@/components/posts/VoteButtons'
import type { Votable } from '@/features/votes/voteCache'
import { rel } from '@/lib/format'

export type PostComment = Votable & {
  content: string
  createdAt: string
  author: { username: string; displayName?: string; firstName: string }
  replies: PostComment[]
}

/** One comment with its vote controls, followed by its replies. */
export function CommentThread({ comment, depth = 0 }: { comment: PostComment; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-3 sm:ml-6 border-l-2 border-rd-border pl-3' : ''}>
      <div className="py-2">
        <p className="text-xs text-rd-muted">
          <Link to={`/profile/${comment.author.username}`} className="font-semibold text-rd-text hover:underline">
            u/{comment.author.username}
          </Link>
          {' · '}
          {rel(comment.createdAt)}
        </p>
        <p className="text-sm mt-1 break-words">{comment.content}</p>
        <div className="mt-1 -ml-1">
          <VoteButtons kind="comment" target={comment} layout="horizontal" />
        </div>
      </div>
      {comment.replies.map((r) => (
        <CommentThread key={r.id} comment={r} depth={depth + 1} />
      ))}
    </div>
  )
}
