import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoSlide } from './VideoSlide'
import type { VideoItem } from './types'

export function VideoDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const { data } = useQuery({
    queryKey: ['video', id],
    queryFn: () => api<{ video: VideoItem; comments: { id: string; content: string; user: { username: string } }[] }>(`/videos/${id}`, { headers: authHeaders(token) }),
  })
  const addComment = useMutation({
    mutationFn: () => api(`/videos/${id}/comment`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ content: comment }) }),
    onSuccess: () => { setComment(''); qc.invalidateQueries({ queryKey: ['video', id] }) },
  })
  if (!data) return null
  return (
    <div className="h-[100dvh] bg-black relative">
      <VideoSlide video={data.video} active />
      <Link to="/" className="absolute top-4 left-4 z-20 text-white text-sm bg-black/50 px-3 py-1 rounded">← Back</Link>
      <div className="absolute bottom-0 left-0 right-0 max-h-[40%] bg-black/90 z-20 p-4 overflow-y-auto">
        <h3 className="font-bold mb-2">Comments</h3>
        {data.comments.map((c) => (
          <p key={c.id} className="text-sm mb-2"><b>@{c.user.username}</b> {c.content}</p>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 bg-white/10 rounded px-3 py-2 text-sm" placeholder="Add comment..." />
          <button type="button" onClick={() => comment && addComment.mutate()} className="text-tt-primary font-semibold text-sm">Post</button>
        </div>
      </div>
    </div>
  )
}
