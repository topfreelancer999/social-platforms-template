import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { StoriesTray } from '@/features/stories/StoriesTray'
import { PostCard } from './PostCard'

export function FeedPage() {
  const { user, accessToken } = useAuthStore()
  const [filter, setFilter] = useState('all')
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam = 1 }) => api<{ items: unknown[]; hasMore: boolean }>(`/feed?page=${pageParam}&filter=${filter}`, { headers: authHeaders(accessToken) }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    initialPageParam: 1,
  })
  const createPost = useMutation({
    mutationFn: () => api('/posts', { method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify({ content: text, privacy: 'FRIENDS' }) }),
    onSuccess: () => { setText(''); setOpen(false); qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
  const posts = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {['all', 'friends', 'groups'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${filter === f ? 'bg-fb-primary text-white' : 'bg-fb-card'}`}>{f === 'all' ? 'All' : f}</button>
        ))}
      </div>
      <StoriesTray />
      <Card className="p-3 mb-4 flex gap-3">
        <Avatar src={user?.avatarUrl} size="lg" />
        <button onClick={() => setOpen(true)} className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-3 text-left text-fb-muted text-[17px]">What&apos;s on your mind?</button>
      </Card>
      {open && (
        <Card className="p-4 mb-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded-lg p-3 text-sm min-h-[100px]" placeholder="What's on your mind?" />
          <button onClick={() => createPost.mutate()} className="mt-2 bg-fb-primary text-white px-4 py-2 rounded-lg font-semibold text-sm">Post</button>
        </Card>
      )}
      {posts.map((p) => <PostCard key={(p as { id: string }).id} post={p} />)}
      {hasNextPage && <button onClick={() => fetchNextPage()} className="w-full py-2 text-fb-primary font-semibold">{isFetchingNextPage ? 'Loading...' : 'Load more'}</button>}
    </div>
  )
}
