import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Heart, MessageCircle } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { SAMPLE_MOMENT_IMAGE } from '@/lib/constants'

type Moment = {
  id: string
  content: string
  imageUrl?: string | null
  location: string
  createdAt: string
  author: { username: string; displayName?: string; firstName: string; avatarUrl: string }
  likeCount: number
  commentCount: number
  liked: boolean
  comments: { id: string; content: string; author: { firstName: string } }[]
}

export function MomentsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [comment, setComment] = useState<Record<string, string>>({})

  const { data } = useQuery({
    queryKey: ['moments'],
    queryFn: () => api<{ moments: Moment[] }>('/moments/feed', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const post = useMutation({
    mutationFn: () =>
      api('/moments', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ content: 'Shared a moment', imageUrl: SAMPLE_MOMENT_IMAGE, location: 'Beijing' }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moments'] }),
  })

  const like = useMutation({
    mutationFn: (id: string) => api(`/moments/${id}/like`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moments'] }),
  })

  const addComment = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api(`/moments/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moments'] }),
  })

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <Link to="/discover" className="absolute left-3 text-wx-text text-sm">←</Link>
        <h1 className="font-medium">Moments</h1>
        <button type="button" onClick={() => post.mutate()} className="absolute right-3 text-wx-green">
          <Camera size={22} />
        </button>
      </header>
      {me && (
        <div className="bg-wx-panel mb-2 p-4 flex items-center gap-3 border-b border-wx-border">
          <img src={me.coverUrl} alt="" className="w-16 h-16 rounded object-cover" />
          <p className="font-medium -mt-8 ml-1 bg-wx-panel pr-2">{me.displayName || me.firstName}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {data?.moments.map((m) => (
          <article key={m.id} className="bg-wx-panel mb-2 px-4 py-3 border-b border-wx-border">
            <div className="flex gap-3">
              <Link to={`/profile/${m.author.username}`}>
                <img src={m.author.avatarUrl} alt="" className="w-10 h-10 rounded" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${m.author.username}`} className="font-medium text-wx-green text-sm">
                  {m.author.displayName || m.author.firstName}
                </Link>
                {m.content && <p className="text-[15px] mt-1 whitespace-pre-wrap">{m.content}</p>}
                {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 max-w-full rounded" />}
                {m.location && <p className="text-xs text-wx-green mt-1">{m.location}</p>}
                <p className="text-xs text-wx-muted mt-2">{rel(m.createdAt)}</p>
                {(m.likeCount > 0 || m.commentCount > 0) && (
                  <div className="mt-2 bg-wx-bg rounded px-2 py-1 text-sm">
                    {m.likeCount > 0 && <p className="text-wx-muted"><Heart size={12} className="inline text-red-500" /> {m.likeCount}</p>}
                    {m.comments.map((c) => (
                      <p key={c.id} className="text-sm"><b>{c.author.firstName}</b> {c.content}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 mt-2 text-wx-muted">
                  <button type="button" onClick={() => like.mutate(m.id)} className={m.liked ? 'text-red-500' : ''}>
                    <Heart size={18} />
                  </button>
                  <MessageCircle size={18} />
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const c = comment[m.id]?.trim()
                    if (c) { addComment.mutate({ id: m.id, content: c }); setComment((s) => ({ ...s, [m.id]: '' })) }
                  }}
                >
                  <input
                    value={comment[m.id] ?? ''}
                    onChange={(e) => setComment((s) => ({ ...s, [m.id]: e.target.value }))}
                    placeholder="Comment"
                    className="flex-1 text-sm bg-wx-bg rounded px-2 py-1 border border-wx-border"
                  />
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
