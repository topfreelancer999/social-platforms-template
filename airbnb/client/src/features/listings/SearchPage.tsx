import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'

export function SearchPage() {
  const [params] = useSearchParams()
  const qs = params.toString()
  const { data, isLoading } = useQuery({
    queryKey: ['listings-search', qs],
    queryFn: () => api<ListingCardData[]>(`/listings?${qs}`),
  })
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">
        {params.get('city') ? `Stays in ${params.get('city')}` : 'Search results'}
      </h1>
      {isLoading && <p>Loading…</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
      {data?.length === 0 && <p className="text-ab-muted">No listings found. Try another city.</p>}
    </div>
  )
}
