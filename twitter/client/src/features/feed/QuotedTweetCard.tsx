import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { rel } from '@/lib/format'
import type { QuotedTweet } from './types'

const frame = 'mt-3 block rounded-2xl border border-x-border-light dark:border-x-border overflow-hidden'

/**
 * Embedded quoted post. `interactive` cards link to the original; the composer
 * preview renders a static, non-clickable card.
 */
export function QuotedTweetCard({ quoted, interactive = true }: { quoted: QuotedTweet | null; interactive?: boolean }) {
  if (!quoted) {
    return (
      <div className={`${frame} px-4 py-3 text-sm text-x-muted bg-black/[0.03] dark:bg-white/[0.04]`}>
        This post is unavailable.
      </div>
    )
  }
  const body = (
    <>
      <div className="px-3 pt-3 flex items-center gap-1.5 text-sm min-w-0">
        <Avatar src={quoted.author.avatarUrl} size="sm" className="h-5 w-5" />
        <span className="font-bold truncate">
          {quoted.author.firstName} {quoted.author.lastName}
        </span>
        {quoted.author.verified && <span className="text-x-primary">✓</span>}
        <span className="text-x-muted truncate">@{quoted.author.username}</span>
        <span className="text-x-muted shrink-0">· {rel(quoted.createdAt)}</span>
      </div>
      <p className="px-3 pt-1 pb-3 text-[15px] whitespace-pre-wrap break-words line-clamp-4">{quoted.content}</p>
      {quoted.imageUrl && <img src={quoted.imageUrl} alt="" className="w-full max-h-72 object-cover border-t border-x-border-light dark:border-x-border" />}
    </>
  )
  if (!interactive) {
    return (
      <div className={`${frame} select-none`} aria-label="Quoted post preview">
        {body}
      </div>
    )
  }
  return (
    <Link
      to={`/tweet/${quoted.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`${frame} hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors`}
    >
      {body}
    </Link>
  )
}
