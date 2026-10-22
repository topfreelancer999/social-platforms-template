import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { rel } from '@/lib/format'
import { useLike, useRepost } from './hooks'
import { QuotedTweetCard } from './QuotedTweetCard'
import { QuoteComposer } from './QuoteComposer'
import { RepostMenu } from './RepostMenu'
import type { Tweet } from './types'

const threadLine = 'w-0.5 bg-[#cfd9de] dark:bg-[#333639]'

/**
 * `thread` draws the connecting line to the previous/next post of a thread on
 * the post page (and drops the divider between connected posts). In lists, a
 * thread post instead gets a "Show this thread" link.
 */
export function TweetCard({ tweet, thread }: { tweet: Tweet; thread?: { above?: boolean; below?: boolean } }) {
  const me = useAuthStore((s) => s.user)
  const like = useLike()
  const repost = useRepost()
  const [quoting, setQuoting] = useState(false)
  const isQuote = !!tweet.quoteTweet || !!tweet.quoteUnavailable
  const reposter = tweet.repostedBy
  const above = !!thread?.above
  const below = !!thread?.below
  const threadLink = thread ? null : (tweet.threadRootId ?? ((tweet.threadLength ?? 1) > 1 ? tweet.id : null))
  return (
    <article
      className={`px-4 ${above ? '' : 'pt-3'} ${below ? '' : 'pb-3 border-b border-x-border-light dark:border-x-border'} hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors`}
    >
      {reposter && (
        <div className="flex items-center gap-3 text-[13px] font-bold text-x-muted mb-1">
          <span className="w-10 flex justify-end shrink-0">
            <Repeat2 size={16} />
          </span>
          <Link to={`/profile/${reposter.username}`} className="hover:underline truncate">
            {reposter.id === me?.id ? 'You' : `${reposter.firstName} ${reposter.lastName}`} reposted
          </Link>
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          {above && <div className={`${threadLine} h-3`} aria-hidden />}
          <Link to={`/profile/${tweet.author.username}`}><Avatar src={tweet.author.avatarUrl} /></Link>
          {(below || threadLink) && <div className={`${threadLine} grow mt-1`} aria-hidden />}
        </div>
        <div className={`flex-1 min-w-0 ${above ? 'pt-3' : ''} ${below ? 'pb-3' : threadLink ? 'pb-2' : ''}`}>
          <div className="flex items-center gap-1 text-sm min-w-0">
            <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline truncate">
              {tweet.author.firstName} {tweet.author.lastName}
            </Link>
            {tweet.author.verified && <span className="text-x-primary">✓</span>}
            <span className="text-x-muted truncate">@{tweet.author.username}</span>
            <Link to={`/tweet/${tweet.id}`} className="text-x-muted hover:underline shrink-0">· {rel(tweet.createdAt)}</Link>
          </div>
          {tweet.content && <p className="mt-1 text-[15px] whitespace-pre-wrap break-words">{tweet.content}</p>}
          {tweet.imageUrl && <img src={tweet.imageUrl} alt="" className="mt-2 rounded-2xl border border-x-border-light dark:border-x-border w-full" />}
          {isQuote && <QuotedTweetCard quoted={tweet.quoteTweet} />}
          <div className="flex justify-between max-w-md mt-3 text-x-muted">
            <Link to={`/tweet/${tweet.id}`} className="flex items-center gap-1 hover:text-x-primary text-xs group">
              <MessageCircle size={18} className="group-hover:bg-x-primary/10 rounded-full p-0.5" />
              {tweet.replyCount || 0}
            </Link>
            <RepostMenu
              reposted={tweet.retweeted}
              count={tweet.retweetCount || 0}
              onRepost={() => repost.mutate({ id: tweet.id, on: !tweet.retweeted })}
              onQuote={() => setQuoting(true)}
            />
            <button onClick={() => like.mutate(tweet.id)} className={`flex items-center gap-1 hover:text-pink-500 text-xs ${tweet.liked ? 'text-pink-500' : ''}`}>
              <Heart size={18} fill={tweet.liked ? 'currentColor' : 'none'} /> {tweet.likeCount || 0}
            </button>
            <button className="hover:text-x-primary"><Share size={18} /></button>
          </div>
        </div>
      </div>
      {threadLink && (
        <div className="flex gap-3 items-center">
          <div className="w-10 flex justify-center shrink-0">
            <Avatar src={tweet.author.avatarUrl} size="sm" className="h-8 w-8" />
          </div>
          <Link to={`/tweet/${threadLink}`} className="text-x-primary text-[15px] hover:underline">
            Show this thread
          </Link>
        </div>
      )}
      {quoting && (
        <QuoteComposer
          quoted={{ id: tweet.id, content: tweet.content, imageUrl: tweet.imageUrl, createdAt: tweet.createdAt, author: tweet.author }}
          onClose={() => setQuoting(false)}
        />
      )}
    </article>
  )
}
