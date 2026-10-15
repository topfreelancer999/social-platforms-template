import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PinCard, type PinItem } from '@/components/pins/PinCard'

export function ExplorePage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: () => api<{ pins: PinItem[] }>('/pins/explore', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Explore</h1>
      <p className="mb-6 text-sm text-[var(--pin-gray)]">Discover ideas from everyone on Pinterest</p>
      {isLoading && <p className="text-[var(--pin-gray)]">Loading…</p>}
      <div className="masonry">
        {(data?.pins ?? []).map((pin) => (
          <PinCard key={pin.id} pin={pin} />
        ))}
      </div>
    </div>
  )
}
