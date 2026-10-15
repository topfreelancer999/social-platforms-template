import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const PRESETS = [
  'https://picsum.photos/seed/new1/400/600',
  'https://picsum.photos/seed/new2/400/500',
  'https://picsum.photos/seed/new3/400/700',
]

export function CreatePinPage() {
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState(PRESETS[0])
  const [boardId, setBoardId] = useState('')

  const { data: boards } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api<{ boards: { id: string; name: string }[] }>('/boards', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const create = useMutation({
    mutationFn: () =>
      api<{ pin: { id: string } }>('/pins', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ title, description, imageUrl, boardId: boardId || boards?.boards[0]?.id }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      navigate(`/pin/${res.pin.id}`)
    },
  })

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Create Pin</h1>
      <div className="mb-4 flex gap-2">
        {PRESETS.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setImageUrl(url)}
            className={`h-20 w-16 overflow-hidden rounded-lg border-2 ${imageUrl === url ? 'border-[var(--pin-red)]' : 'border-transparent'}`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <img src={imageUrl} alt="Preview" className="mb-4 w-full rounded-2xl" />
      <div className="space-y-3">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="block text-sm font-semibold">
          Board
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--pin-border)] px-3 py-2"
          >
            {(boards?.boards ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="w-full rounded-full bg-[var(--pin-red)] text-white"
          disabled={!title.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Publishing…' : 'Publish Pin'}
        </Button>
      </div>
    </div>
  )
}
