import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { VoteButtons } from './VoteButtons'
import { rel } from '@/lib/format'

export interface RedditPost {
  id: string
  title: string
  body: string
  imageUrl?: string | null
  linkUrl?: string | null
  createdAt: string
  score: number
  upvotes: number
  downvotes: number
  commentCount: number
  myVote: number
  author: { username: string; displayName?: string; avatarUrl: string }
  subreddit: { slug: string; name: string; iconUrl: string }
}

export function PostCard({ post, compact }: { post: RedditPost; compact?: boolean }) {
  return (
    <article className="bg-rd-card border border-rd-border rounded-lg flex overflow-hidden mb-3 hover:border-rd-muted">
      <VoteButtons kind="post" target={post} />
      <div className="flex-1 min-w-0 p-3">
        <p className="text-xs text-rd-muted flex flex-wrap items-center gap-1 mb-1">
          <img src={post.subreddit.iconUrl} alt="" className="w-5 h-5 rounded-full" />
          <Link to={`/r/${post.subreddit.slug}`} className="font-semibold hover:underline">r/{post.subreddit.name}</Link>
          <span>·</span>
          <span>Posted by <Link to={`/profile/${post.author.username}`} className="hover:underline">u/{post.author.username}</Link></span>
          <span>·</span>
          <span>{rel(post.createdAt)}</span>
        </p>
        <Link to={`/post/${post.id}`}>
          <h2 className="text-lg font-medium mb-2 hover:text-rd-blue">{post.title}</h2>
        </Link>
        {!compact && post.body && <p className="text-sm text-rd-text mb-2 line-clamp-3">{post.body}</p>}
        {post.imageUrl && (
          <Link to={`/post/${post.id}`}>
            <img src={post.imageUrl} alt="" className="max-h-96 w-full object-cover rounded border border-rd-border mb-2" />
          </Link>
        )}
        <div className="flex gap-2 sm:gap-4 text-xs font-semibold text-rd-muted">
          <Link to={`/post/${post.id}`} className="flex items-center gap-1 hover:bg-rd-bg px-2 py-1 rounded">
            <MessageSquare size={16} /> {post.commentCount} Comments
          </Link>
          <button type="button" className="hover:bg-rd-bg px-2 py-1 rounded">Share</button>
        </div>
      </div>
    </article>
  )
}
