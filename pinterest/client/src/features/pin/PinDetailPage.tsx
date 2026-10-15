import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import type { PinItem } from '@/components/pins/PinCard'

export function PinDetailPage() {
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const [boardId, setBoardId] = useState('')

  const { data } = useQuery({
    queryKey: ['pin', id],
    queryFn: () =>
      api<{ pin: PinItem; comments: { id: string; content: string; user: { username: string } }[] }>(
        `/pins/${id}`,
        { headers: authHeaders(token!) },
      ),
    enabled: !!id && !!token,
  })

  const { data: boards } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api<{ boards: { id: string; name: string }[] }>('/boards', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const save = useMutation({
    mutationFn: () =>
      api(`/pins/${id}/save`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ boardId: boardId || boards?.boards[0]?.id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pin', id] }),
  })

  const addComment = useMutation({
    mutationFn: () =>
      api(`/pins/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ content: comment }),
      }),
    onSuccess: () => {
      setComment('')
      qc.invalidateQueries({ queryKey: ['pin', id] })
    },
  })

  if (!data) return <p className="text-[var(--pin-gray)]">Loading…</p>
  const { pin, comments } = data

  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
      <img src={pin.imageUrl} alt={pin.title} className="w-full rounded-2xl object-cover" />
      <div>
        <h1 className="text-3xl font-bold">{pin.title}</h1>
        <Link to={`/profile/${pin.author.username}`} className="mt-2 inline-block text-sm font-semibold text-[var(--pin-red)]">
          @{pin.author.username}
        </Link>
        {pin.description && <p className="mt-4 text-[var(--pin-gray)]">{pin.description}</p>}
        <p className="mt-2 text-sm text-[var(--pin-gray)]">{pin.saveCount ?? 0} saves · {comments.length} comments</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="rounded-full border border-[var(--pin-border)] px-3 py-2 text-sm"
          >
            {(boards?.boards ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button
            className="rounded-full bg-[var(--pin-red)] text-white hover:bg-[var(--pin-red-hover)]"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {pin.savedByMe ? 'Saved' : 'Save'}
          </Button>
        </div>

        <section className="mt-8">
          <h2 className="font-bold">Comments</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment"
              className="flex-1 rounded-full border border-[var(--pin-border)] px-4 py-2 text-sm"
            />
            <Button variant="secondary" onClick={() => addComment.mutate()} disabled={!comment.trim()}>
              Post
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-semibold">@{c.user.username}</span> {c.content}
              </li>
            ))}
          </ul>
        </section>

        {user && (
          <Link to="/create" className="mt-6 inline-block text-sm font-semibold text-[var(--pin-red)]">
            Create your own pin →
          </Link>
        )}
      </div>
    </div>
  )
}
