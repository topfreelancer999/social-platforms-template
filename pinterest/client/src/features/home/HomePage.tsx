import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PinCard, type PinItem } from '@/components/pins/PinCard'

export function HomePage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api<{ pins: PinItem[] }>('/pins/feed', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Home feed</h1>
        <div className="flex gap-2 text-sm">
          <Link to="/channels" className="font-semibold text-[var(--pin-red)] hover:underline">
            Post channels
          </Link>
          <Link to="/groups" className="font-semibold text-[var(--pin-gray)] hover:underline">
            Groups
          </Link>
          <Link to="/feedback" className="font-semibold text-[var(--pin-gray)] hover:underline">
            Feedback
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-[var(--pin-gray)]">Loading pins…</p>}

      <div className="masonry">
        {(data?.pins ?? []).map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </div>
    </div>
  )
}
