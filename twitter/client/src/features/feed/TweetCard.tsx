import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { rel } from '@/lib/format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TweetCard({ tweet }: { tweet: any }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const like = useMutation({
    mutationFn: () => api(`/tweets/${tweet.id}/like`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
  const retweet = useMutation({
    mutationFn: () => api(`/tweets/${tweet.id}/retweet`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
  return (
    <article className="border-b border-x-border-light dark:border-x-border px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
      <div className="flex gap-3">
        <Link to={`/profile/${tweet.author.username}`}><Avatar src={tweet.author.avatarUrl} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm">
            <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline truncate">
              {tweet.author.firstName} {tweet.author.lastName}
            </Link>
            {tweet.author.verified && <span className="text-x-primary">✓</span>}
            <span className="text-x-muted truncate">@{tweet.author.username}</span>
            <span className="text-x-muted">· {rel(tweet.createdAt)}</span>
          </div>
          {tweet.quoteTweet && (
            <div className="mt-2 border border-x-border-light dark:border-x-border rounded-xl p-3 text-sm">
              <p className="font-semibold">{tweet.quoteTweet.author.firstName}</p>
              <p className="text-x-muted">{tweet.quoteTweet.content}</p>
            </div>
          )}
          <p className="mt-1 text-[15px] whitespace-pre-wrap break-words">{tweet.content}</p>
          {tweet.imageUrl && <img src={tweet.imageUrl} alt="" className="mt-2 rounded-2xl border border-x-border-light dark:border-x-border w-full" />}
          <div className="flex justify-between max-w-md mt-3 text-x-muted">
            <Link to={`/tweet/${tweet.id}`} className="flex items-center gap-1 hover:text-x-primary text-xs group">
              <MessageCircle size={18} className="group-hover:bg-x-primary/10 rounded-full p-0.5" />
              {tweet.replyCount || 0}
            </Link>
            <button onClick={() => retweet.mutate()} className={`flex items-center gap-1 hover:text-green-500 text-xs ${tweet.retweeted ? 'text-green-500' : ''}`}>
              <Repeat2 size={18} /> {tweet.retweetCount || 0}
            </button>
            <button onClick={() => like.mutate()} className={`flex items-center gap-1 hover:text-pink-500 text-xs ${tweet.liked ? 'text-pink-500' : ''}`}>
              <Heart size={18} fill={tweet.liked ? 'currentColor' : 'none'} /> {tweet.likeCount || 0}
            </button>
            <button className="hover:text-x-primary"><Share size={18} /></button>
          </div>
        </div>
      </div>
    </article>
  )
}
