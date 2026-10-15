import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Share2, ThumbsUp } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { rel } from '@/lib/format'
import { REACTIONS, REACTION_EMOJI } from '@/lib/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PostCard({ post }: { post: any }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const react = useMutation({
    mutationFn: (type: string) => api(`/posts/${post.id}/react`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ type }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
  const addComment = useMutation({
    mutationFn: () => api(`/posts/${post.id}/comments`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ content: comment }) }),
    onSuccess: () => { setComment(''); qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
  return (
    <Card className="p-0 overflow-hidden mb-4">
      <div className="p-3 flex gap-2 items-center">
        <Link to={`/profile/${post.author.username}`}><Avatar src={post.author.avatarUrl} /></Link>
        <div>
          <Link to={`/profile/${post.author.username}`} className="font-semibold text-sm hover:underline">{post.author.firstName} {post.author.lastName}</Link>
          <p className="text-xs text-fb-muted">{rel(post.createdAt)}</p>
        </div>
      </div>
      <p className="px-3 pb-2 text-[15px] whitespace-pre-wrap">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full" />}
      <div className="px-3 py-1 text-xs text-fb-muted flex justify-between">
        <span>{post.totalReactions} reactions</span>
        <span>{post.commentCount} comments</span>
      </div>
      <div className="border-t mx-3 flex">
        <div className="relative flex-1 group">
          <button onClick={() => react.mutate('LIKE')} className="w-full flex items-center justify-center gap-1 py-2 text-sm text-fb-muted hover:bg-[#f0f2f5] rounded">
            <ThumbsUp size={18} /> {post.myReaction ? REACTION_EMOJI[post.myReaction] : 'Like'}
          </button>
          <div className="hidden group-hover:flex absolute bottom-full left-0 bg-white shadow-lg rounded-full p-1 gap-1 border">
            {REACTIONS.map((t) => <button key={t} onClick={() => react.mutate(t)} className="text-xl hover:scale-125">{REACTION_EMOJI[t]}</button>)}
          </div>
        </div>
        <button onClick={() => setShowComments(!showComments)} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-fb-muted hover:bg-[#f0f2f5] rounded">
          <MessageCircle size={18} /> Comment
        </button>
        <button onClick={() => api(`/posts/${post.id}/share`, { method: 'POST', headers: authHeaders(token) }).then(() => qc.invalidateQueries({ queryKey: ['feed'] }))} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-fb-muted hover:bg-[#f0f2f5] rounded">
          <Share2 size={18} /> Share
        </button>
      </div>
      {showComments && (
        <div className="p-3 border-t bg-[#f0f2f5]">
          {post.comments?.map((c: { id: string; content: string; author: { firstName: string; lastName: string } }) => (
            <p key={c.id} className="text-sm mb-1"><b>{c.author.firstName}</b> {c.content}</p>
          ))}
          <div className="flex gap-2 mt-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 rounded-full px-3 py-1 text-sm border" placeholder="Write a comment..." />
            <button onClick={() => comment && addComment.mutate()} className="text-fb-primary font-semibold text-sm">Post</button>
          </div>
        </div>
      )}
    </Card>
  )
}
