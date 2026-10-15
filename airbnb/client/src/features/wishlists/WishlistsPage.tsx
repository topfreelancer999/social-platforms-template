import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'

export function WishlistsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api<{ name: string; items: { listing: ListingCardData }[] }>('/wishlists', { headers: authHeaders(token) }),
  })
  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold">{data?.name ?? 'Wishlists'}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {data?.items?.map((item) => (
          <ListingCard key={item.listing.id} listing={item.listing} />
        ))}
      </div>
      {!data?.items?.length && <p className="text-ab-muted mt-4">Save places you like by clicking the heart on a listing.</p>}
    </div>
  )
}
