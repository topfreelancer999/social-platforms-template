import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function HostPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data: bookings } = useQuery({
    queryKey: ['host-bookings'],
    queryFn: () => api<{ id: string; guests: number; totalPrice: number; guest: { firstName: string }; listing: { title: string } }[]>('/bookings/host', { headers: authHeaders(token) }),
  })
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold">Host dashboard</h1>
      <p className="text-ab-muted mt-1">Manage reservations and listings</p>
      <Link to="/host/listing/new"><Button className="mt-4 rounded-lg">Create new listing</Button></Link>
      <h2 className="font-semibold text-lg mt-8 mb-3">Reservations</h2>
      {bookings?.map((b) => (
        <div key={b.id} className="border border-ab-border rounded-xl p-4 mb-3">
          <p className="font-semibold">{b.listing.title}</p>
          <p className="text-sm text-ab-muted">Guest: {b.guest.firstName} · {b.guests} guests</p>
          <p className="font-semibold mt-1">${b.totalPrice}</p>
        </div>
      ))}
      {!bookings?.length && <p className="text-ab-muted text-sm">No reservations yet.</p>}
    </div>
  )
}
