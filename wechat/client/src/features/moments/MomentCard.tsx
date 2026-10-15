import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Lock, MessageCircle, Users } from 'lucide-react'
import { rel } from '@/lib/format'
import { displayName } from '@/features/contacts/api'
import { type Moment, useAddComment, useDeleteMoment, useToggleLike, visibilitySummary } from './api'

/** Small lock / people icon shown on the viewer's own restricted Moments. */
export function VisibilityBadge({ moment }: { moment: Pick<Moment, 'visibility' | 'audience'> }) {
  const summary = visibilitySummary(moment)
  if (!summary) return null
  const Icon = moment.visibility === 'PRIVATE' ? Lock : Users
  return (
    <span title={summary} aria-label={summary} className="inline-flex items-center text-wx-muted">
      <Icon size={12} />
    </span>
  )
}

export function MomentCard({ moment: m, onDeleted }: { moment: Moment; onDeleted?: () => void }) {
  const [comment, setComment] = useState('')
  const like = useToggleLike()
  const addComment = useAddComment()
  const remove = useDeleteMoment()

  return (
    <article className="bg-wx-panel mb-2 px-4 py-3 border-b border-wx-border">
      <div className="flex gap-3">
        <Link to={`/profile/${m.author.username}`} className="shrink-0">
          <img src={m.author.avatarUrl} alt="" className="w-10 h-10 rounded" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${m.author.username}`} className="font-medium text-[#576b95] text-sm">
            {displayName(m.author)}
          </Link>
          {m.content && <p className="text-[15px] mt-1 whitespace-pre-wrap break-words">{m.content}</p>}
          {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 max-w-full sm:max-w-xs rounded" />}
          {m.location && <p className="text-xs text-[#576b95] mt-1">{m.location}</p>}
          <div className="flex items-center gap-2 mt-2 text-xs text-wx-muted">
            <Link to={`/moments/${m.id}`} className="hover:underline">{rel(m.createdAt)}</Link>
            {m.isAuthor && <VisibilityBadge moment={m} />}
            {m.isAuthor && (
              <button
                type="button"
                className="text-[#576b95] hover:underline disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm('Delete this Moment?')) remove.mutate(m.id, { onSuccess: onDeleted })
                }}
              >
                Delete
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => like.mutate(m.id)}
              className={m.liked ? 'text-red-500' : ''}
              aria-label={m.liked ? 'Unlike' : 'Like'}
            >
              <Heart size={18} fill={m.liked ? 'currentColor' : 'none'} />
            </button>
            <MessageCircle size={18} />
          </div>
          {(m.likeCount > 0 || m.commentCount > 0) && (
            <div className="mt-2 bg-wx-bg rounded px-2 py-1 text-sm">
              {m.likeCount > 0 && (
                <p className="text-[#576b95] py-0.5">
                  <Heart size={12} className="inline mr-1" />
                  {m.likes.map((l) => displayName(l.user)).join(', ')}
                </p>
              )}
              {m.likeCount > 0 && m.commentCount > 0 && <hr className="border-wx-border my-1" />}
              {m.comments.map((c) => (
                <p key={c.id} className="text-sm py-0.5 break-words">
                  <Link to={`/profile/${c.author.username}`} className="text-[#576b95] font-medium">
                    {displayName(c.author)}
                  </Link>
                  : {c.content}
                </p>
              ))}
            </div>
          )}
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const c = comment.trim()
              if (c) addComment.mutate({ id: m.id, content: c }, { onSuccess: () => setComment('') })
            }}
          >
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment"
              maxLength={500}
              className="flex-1 min-w-0 text-sm bg-wx-bg rounded px-2 py-1 border border-wx-border"
            />
          </form>
          {(like.isError || addComment.isError) && (
            <p className="text-xs text-red-500 mt-1">{(like.error ?? addComment.error)?.message}</p>
          )}
        </div>
      </div>
    </article>
  )
}
