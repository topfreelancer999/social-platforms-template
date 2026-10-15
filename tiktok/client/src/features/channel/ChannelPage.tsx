import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PostCard } from '@/features/feed/PostCard'
import { BottomNav } from '@/components/layout/BottomNav'

export function ChannelPage() {
  const { accessToken } = useAuthStore()
  const [text, setText] = useState('')
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['feed', 'channel'],
    queryFn: () => api<{ items: unknown[] }>('/feed?filter=all', { headers: authHeaders(accessToken) }),
  })
  const createPost = useMutation({
    mutationFn: () => api('/posts', { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ content: text, privacy: 'PUBLIC' }) }),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
  const posts = data?.items ?? []
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20 px-4 pt-4">
      <h1 className="text-xl font-bold mb-1">Creator channel</h1>
      <p className="text-sm text-tt-muted mb-4">Posts from creators you follow</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-white/10 rounded-lg p-3 text-sm mb-2" placeholder="Post an update..." />
      <button type="button" onClick={() => text && createPost.mutate()} className="bg-tt-primary px-4 py-2 rounded font-semibold text-sm mb-4">Post</button>
      {posts.map((p) => <PostCard key={(p as { id: string }).id} post={p} />)}
      <Link to="/groups" className="text-tt-secondary text-sm">Join communities →</Link>
      <BottomNav />
    </div>
  )
}
