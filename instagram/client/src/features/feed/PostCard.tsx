import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

export interface IgPost {
  id: string
  caption: string
  imageUrl?: string | null
  videoUrl?: string | null
  type?: string
  createdAt: string
  author: { username: string; avatarUrl: string; displayName?: string; firstName: string; verified?: boolean }
  likeCount: number
  commentCount: number
  liked: boolean
  comments?: { id: string; content: string; author: { username: string; firstName: string } }[]
}

export function PostCard({ post }: { post: IgPost }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const like = useMutation({
    mutationFn: () => api(`/posts/${post.id}/like`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['explore'] })
    },
  })
  const addComment = useMutation({
    mutationFn: () =>
      api(`/posts/${post.id}/comments`, {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ content: comment }),
      }),
    onSuccess: () => {
      setComment('')
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  return (
    <article className="border-b border-ig-border pb-4 mb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/profile/${post.author.username}`}>
          <img src={post.author.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        </Link>
        <Link to={`/profile/${post.author.username}`} className="font-semibold text-sm flex items-center gap-1">
          {post.author.username}
          {post.author.verified && <span className="text-ig-blue text-xs">✓</span>}
        </Link>
      </div>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="w-full aspect-square object-cover bg-ig-surface" />
      )}
      {post.videoUrl && !post.imageUrl && (
        <video src={post.videoUrl} controls className="w-full aspect-square bg-black" />
      )}
      <div className="px-4 pt-3 flex justify-between">
        <div className="flex gap-4">
          <button type="button" onClick={() => like.mutate()} className="hover:opacity-70">
            <Heart size={24} className={post.liked ? 'fill-red-500 text-red-500' : ''} />
          </button>
          <button type="button" className="hover:opacity-70"><MessageCircle size={24} /></button>
          <button type="button" className="hover:opacity-70"><Send size={24} /></button>
        </div>
        <button type="button" className="hover:opacity-70"><Bookmark size={24} /></button>
      </div>
      <p className="px-4 pt-2 text-sm font-semibold">{post.likeCount.toLocaleString()} likes</p>
      <p className="px-4 pt-1 text-sm">
        <Link to={`/profile/${post.author.username}`} className="font-semibold mr-2">{post.author.username}</Link>
        {post.caption}
      </p>
      {post.commentCount > 0 && (
        <button type="button" className="px-4 pt-1 text-sm text-ig-muted">View all {post.commentCount} comments</button>
      )}
      <p className="px-4 pt-1 text-[10px] text-ig-muted uppercase">{rel(post.createdAt)}</p>
      <form
        className="px-4 pt-2 flex gap-2 border-t border-ig-border mt-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (comment.trim()) addComment.mutate()
        }}
      >
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {comment.trim() && (
          <button type="submit" className="text-ig-blue font-semibold text-sm">Post</button>
        )}
      </form>
    </article>
  )
}
