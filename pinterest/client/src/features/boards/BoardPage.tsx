import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PinCard, type PinItem } from '@/components/pins/PinCard'

export function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['board', id],
    queryFn: () =>
      api<{ board: { name: string; description: string }; pins: PinItem[] }>(`/boards/${id}`, {
        headers: authHeaders(token!),
      }),
    enabled: !!id && !!token,
  })

  if (!data) return <p className="text-[var(--pin-gray)]">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold">{data.board.name}</h1>
      {data.board.description && <p className="mt-1 text-[var(--pin-gray)]">{data.board.description}</p>}
      <div className="masonry mt-6">
        {data.pins.map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </div>
    </div>
  )
}
