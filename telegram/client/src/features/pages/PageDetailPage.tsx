import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { rel } from '@/lib/format'

export function PageDetailPage() {
  const { slug } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => api<{ page: { name: string; description: string; category: string }; averageRating: number; reviewCount: number; recentReviews: { rating: number; content: string; user: { firstName: string }; createdAt: string }[] }>(`/pages/${slug}`),
  })
  const submitReview = useMutation({
    mutationFn: () => api(`/pages/${slug}/reviews`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ rating, content }) }),
    onSuccess: () => { setContent(''); qc.invalidateQueries({ queryKey: ['page', slug] }) },
  })
  if (!data) return null
  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="h-40 bg-fb-primary" />
        <div className="p-4 -mt-8">
          <h1 className="text-3xl font-bold">{data.page.name}</h1>
          <p className="text-fb-muted">{data.page.category}</p>
          <p className="mt-2">★ {data.averageRating} ({data.reviewCount} reviews)</p>
          <p className="mt-2 text-sm">{data.page.description}</p>
          <Link to={`/pages/${slug}/reviews`} className="text-fb-primary font-semibold text-sm">See all reviews</Link>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Write a review</h2>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded p-2 mb-2">
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
        </select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} />
        <Button className="mt-2" onClick={() => content && submitReview.mutate()}>Submit review</Button>
      </Card>
      {data.recentReviews.map((r, i) => (
        <Card key={i} className="p-3">
          <p className="font-semibold text-sm">{r.user.firstName} · {'★'.repeat(r.rating)}</p>
          <p className="text-sm">{r.content}</p>
          <p className="text-xs text-fb-muted">{rel(r.createdAt)}</p>
        </Card>
      ))}
    </div>
  )
}
