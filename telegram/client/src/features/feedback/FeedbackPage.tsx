import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function FeedbackPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [done, setDone] = useState(false)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await api('/feedback', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        category: fd.get('category'),
        message: fd.get('message'),
        rating: Number(fd.get('rating')) || undefined,
      }),
    })
    setDone(true)
  }
  return (
    <Card className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Send Feedback</h1>
      {done ? <p className="text-green-600">Thank you for your feedback!</p> : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium">Category
            <select name="category" className="w-full border rounded-lg p-2 mt-1">
              <option value="bug">Bug report</option>
              <option value="feature">Feature request</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Rating (optional)
            <select name="rating" className="w-full border rounded-lg p-2 mt-1">
              <option value="">—</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Message
            <textarea name="message" required rows={4} className="w-full border rounded-lg p-2 mt-1" />
          </label>
          <Button type="submit" className="w-full">Submit</Button>
        </form>
      )}
    </Card>
  )
}
