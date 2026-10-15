import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

export function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const { data } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api<{
      id: string
      title: string
      description: string
      city: string
      country: string
      pricePerNight: number
      photos: string[]
      amenities: string[]
      maxGuests: number
      bedrooms: number
      beds: number
      baths: number
      host: { firstName: string; lastName: string; username: string; avatarUrl: string; superhost: boolean }
      reviews: { rating: number; content: string; user: { firstName: string } }[]
      averageRating: number
    }>(`/listings/${id}`),
  })
  const wishlist = useMutation({
    mutationFn: () => api(`/wishlists/${id}`, { method: 'POST', headers: authHeaders(accessToken) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
  const book = useMutation({
    mutationFn: () =>
      api('/bookings', {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ listingId: id, checkIn, checkOut, guests }),
      }),
    onSuccess: () => navigate('/trips'),
  })
  if (!data) return <p className="p-8">Loading…</p>
  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0
  const total = nights * data.pricePerNight
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-semibold">{data.title}</h1>
      <p className="text-ab-muted text-sm mt-1">
        ★ {data.averageRating || 'New'} · {data.city}, {data.country}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-xl overflow-hidden mt-4 h-[300px] md:h-[400px]">
        <img src={data.photos[0]} alt="" className="w-full h-full object-cover md:col-span-1" />
        <div className="hidden md:grid grid-cols-2 gap-2">
          {data.photos.slice(1, 3).map((p) => (
            <img key={p} src={p} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-ab-border">
            <Link to={`/profile/${data.host.username}`}><Avatar src={data.host.avatarUrl} size="lg" /></Link>
            <div>
              <p className="font-semibold">Hosted by {data.host.firstName}</p>
              {data.host.superhost && <p className="text-sm text-ab-muted">Superhost</p>}
            </div>
          </div>
          <p className="text-ab-muted">{data.bedrooms} bedrooms · {data.beds} beds · {data.baths} baths · {data.maxGuests} guests max</p>
          <p className="leading-relaxed">{data.description}</p>
          <div>
            <h3 className="font-semibold mb-2">What this place offers</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {data.amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Reviews</h3>
            {data.reviews.map((r, i) => (
              <p key={i} className="text-sm border-b py-2"><b>{r.user.firstName}</b> ★{r.rating} — {r.content}</p>
            ))}
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="sticky top-24 border border-ab-border rounded-xl shadow-lg p-6">
            <p className="text-xl"><span className="font-semibold">${data.pricePerNight}</span> <span className="text-ab-muted text-base font-normal">night</span></p>
            <div className="border border-ab-border rounded-lg mt-4 overflow-hidden text-sm">
              <div className="grid grid-cols-2 border-b border-ab-border">
                <label className="p-2 border-r border-ab-border">
                  <span className="text-xs font-bold block">CHECK-IN</span>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full outline-none" />
                </label>
                <label className="p-2">
                  <span className="text-xs font-bold block">CHECK-OUT</span>
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full outline-none" />
                </label>
              </div>
              <label className="p-2 block">
                <span className="text-xs font-bold block">GUESTS</span>
                <input type="number" min={1} max={data.maxGuests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full outline-none" />
              </label>
            </div>
            {user ? (
              <Button className="w-full mt-4 rounded-lg bg-ab-primary hover:bg-ab-primary-hover" disabled={!checkIn || !checkOut || book.isPending} onClick={() => book.mutate()}>
                Reserve
              </Button>
            ) : (
              <Link to="/login"><Button className="w-full mt-4">Log in to book</Button></Link>
            )}
            <Button variant="secondary" className="w-full mt-2 rounded-lg" onClick={() => wishlist.mutate()}>Save to wishlist</Button>
            {nights > 0 && <p className="text-center text-sm mt-3">${total} total for {nights} nights</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
