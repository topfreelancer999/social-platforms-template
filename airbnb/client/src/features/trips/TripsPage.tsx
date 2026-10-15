import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function TripsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['trips'],
    queryFn: () =>
      api<{
        upcoming: { id: string; checkIn: string; checkOut: string; totalPrice: number; listing: { id: string; title: string; city: string } }[]
        past: { id: string; checkIn: string; checkOut: string; listing: { title: string } }[]
      }>('/bookings/trips', { headers: authHeaders(token) }),
  })
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">Trips</h1>
      <h2 className="font-semibold text-lg mb-3">Upcoming</h2>
      {data?.upcoming?.length === 0 && <p className="text-ab-muted text-sm mb-6">No upcoming trips.</p>}
      {data?.upcoming?.map((b) => (
        <Link key={b.id} to={`/listing/${b.listing.id}`} className="block border border-ab-border rounded-xl p-4 mb-3 hover:shadow-md">
          <p className="font-semibold">{b.listing.title}</p>
          <p className="text-sm text-ab-muted">{b.listing.city}</p>
          <p className="text-sm mt-1">{format(new Date(b.checkIn), 'MMM d')} – {format(new Date(b.checkOut), 'MMM d, yyyy')}</p>
          <p className="font-semibold mt-2">${b.totalPrice}</p>
        </Link>
      ))}
      <h2 className="font-semibold text-lg mt-8 mb-3">Past</h2>
      {data?.past?.map((b) => (
        <div key={b.id} className="border border-ab-border rounded-xl p-4 mb-3 opacity-80">
          <p className="font-semibold">{b.listing.title}</p>
          <p className="text-sm text-ab-muted">{format(new Date(b.checkIn), 'MMM yyyy')}</p>
        </div>
      ))}
    </div>
  )
}
