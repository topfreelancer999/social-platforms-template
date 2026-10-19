import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { formatDay } from '@/lib/dates'
import { HostTabs } from './HostTabs'

export function HostPage() {
  const token = useAuthStore((s) => s.accessToken)
  const { data: bookings } = useQuery({
    queryKey: ['host-bookings'],
    queryFn: () => api<{ id: string; checkIn: string; checkOut: string; status: string; guests: number; totalPrice: number; guest: { firstName: string }; listing: { id: string; title: string } }[]>('/bookings/host', { headers: authHeaders(token) }),
  })
  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8">
      <HostTabs />
      <h1 className="text-3xl font-semibold">Host dashboard</h1>
      <p className="text-ab-muted mt-1">Manage reservations and listings</p>
      <Link to="/host/listing/new"><Button className="mt-4 rounded-lg">Create new listing</Button></Link>
      <h2 className="font-semibold text-lg mt-8 mb-3">Reservations</h2>
      {bookings?.map((b) => (
        <div key={b.id} className="border border-ab-border rounded-xl p-4 mb-3">
          <p className="font-semibold">{b.listing.title}</p>
          <p className="text-sm text-ab-muted">Guest: {b.guest.firstName} · {b.guests} guests · {formatDay(b.checkIn)} – {formatDay(b.checkOut, { month: 'short', day: 'numeric', year: 'numeric' })}{b.status === 'CANCELLED' && ' · Cancelled'}</p>
          <Link to={`/host/calendar?listing=${b.listing.id}`} className="text-sm font-semibold underline mt-1 inline-block">View in calendar</Link>
          <p className="font-semibold mt-1">${b.totalPrice}</p>
        </div>
      ))}
      {!bookings?.length && <p className="text-ab-muted text-sm">No reservations yet.</p>}
    </div>
  )
}
