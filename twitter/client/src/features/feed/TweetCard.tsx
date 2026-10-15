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

export function TweetCard({ tweet }: { tweet: Tweet }) {
  const me = useAuthStore((s) => s.user)
  const like = useLike()
  const repost = useRepost()
  const [quoting, setQuoting] = useState(false)
  const isQuote = !!tweet.quoteTweet || !!tweet.quoteUnavailable
  const reposter = tweet.repostedBy
  return (
    <article className="border-b border-x-border-light dark:border-x-border px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
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
        <Link to={`/profile/${tweet.author.username}`}><Avatar src={tweet.author.avatarUrl} /></Link>
        <div className="flex-1 min-w-0">
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
      {quoting && (
        <QuoteComposer
          quoted={{ id: tweet.id, content: tweet.content, imageUrl: tweet.imageUrl, createdAt: tweet.createdAt, author: tweet.author }}
          onClose={() => setQuoting(false)}
        />
      )}
    </article>
  )
}
