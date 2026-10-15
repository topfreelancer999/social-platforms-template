import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function SubmitPage() {
  const [params] = useSearchParams()
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [subredditSlug, setSubredditSlug] = useState(params.get('subreddit') ?? 'programming')
  const [imageUrl, setImageUrl] = useState('')

  const { data } = useQuery({
    queryKey: ['subreddits'],
    queryFn: () => api<{ subreddits: { slug: string; name: string }[] }>('/subreddits', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const submit = useMutation({
    mutationFn: () =>
      api('/posts', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ title, body, subredditSlug, imageUrl: imageUrl || undefined }),
      }),
    onSuccess: (res) => navigate(`/post/${(res as { id: string }).id}`),
  })

  return (
    <div className="bg-rd-card border border-rd-border rounded-lg p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Create a post</h1>
      <label className="block text-sm font-semibold mb-1">Community</label>
      <select
        value={subredditSlug}
        onChange={(e) => setSubredditSlug(e.target.value)}
        className="w-full mb-4 border border-rd-border rounded px-3 py-2 text-sm"
      >
        {data?.subreddits.map((s) => (
          <option key={s.slug} value={s.slug}>r/{s.name}</option>
        ))}
      </select>
      <label className="block text-sm font-semibold mb-1">Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mb-4 border border-rd-border rounded px-3 py-2 text-sm" />
      <label className="block text-sm font-semibold mb-1">Body (optional)</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full mb-4 border border-rd-border rounded px-3 py-2 text-sm min-h-32" />
      <label className="block text-sm font-semibold mb-1">Image URL (optional)</label>
      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full mb-4 border border-rd-border rounded px-3 py-2 text-sm" />
      <Button onClick={() => submit.mutate()} disabled={!title.trim()} className="bg-rd-blue text-white w-full">
        Post
      </Button>
    </div>
  )
}
