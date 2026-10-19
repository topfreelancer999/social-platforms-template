import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DateRangePicker } from '@/components/calendar/DateRangePicker'
import { rangeHeading, type DateRange, type StayRules } from '@/lib/availability'
import { addDays, diffDays, formatDay, todayKey } from '@/lib/dates'

/** How far ahead the picker loads availability (the API books up to a year out). */
const HORIZON_DAYS = 365

const LONG_DATE: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

interface Availability {
  listingId: string
  from: string
  to: string
  minNights: number
  maxNights: number
  unavailable: string[]
}

export function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [range, setRange] = useState<DateRange>({ checkIn: null, checkOut: null })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [guests, setGuests] = useState(1)
  const [today] = useState(todayKey)
  const card = useRef<HTMLDivElement>(null)
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
      host: { id: string; firstName: string; lastName: string; username: string; avatarUrl: string; superhost: boolean }
      reviews: { rating: number; content: string; user: { firstName: string } }[]
      averageRating: number
    }>(`/listings/${id}`),
  })
  const availability = useQuery({
    queryKey: ['availability', id],
    queryFn: () => api<Availability>(`/listings/${id}/availability?from=${today}&to=${addDays(today, HORIZON_DAYS)}`),
  })
  const rules = useMemo<StayRules | null>(
    () =>
      availability.data
        ? {
            unavailable: new Set(availability.data.unavailable),
            minNights: availability.data.minNights,
            maxNights: availability.data.maxNights,
            today,
            lastDay: availability.data.to,
          }
        : null,
    [availability.data, today],
  )

  // Close the dates popover on Escape or a click outside the booking card.
  useEffect(() => {
    if (!pickerOpen) return
    const node = card.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (node && !node.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [pickerOpen])

  const wishlist = useMutation({
    mutationFn: () => api(`/wishlists/${id}`, { method: 'POST', headers: authHeaders(accessToken) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })
  const book = useMutation({
    mutationFn: () =>
      api('/bookings', {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ listingId: id, checkIn: range.checkIn, checkOut: range.checkOut, guests }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', id] })
      qc.invalidateQueries({ queryKey: ['trips'] })
      navigate('/trips')
    },
    // The nights may have been taken since the calendar loaded: refresh it and let the guest pick again.
    onError: () => {
      qc.invalidateQueries({ queryKey: ['availability', id] })
      setRange({ checkIn: null, checkOut: null })
    },
  })
  if (!data) return <p className="p-8">Loading…</p>
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : 0
  const total = nights * data.pricePerNight
  const isOwnListing = user?.id === data.host.id
  const pickDates = (next: DateRange) => {
    setRange(next)
    book.reset()
  }
  const clearDates = () => pickDates({ checkIn: null, checkOut: null })
  // Only mention stay limits that differ from the defaults (1 night minimum, 30 nights maximum).
  const stayHint = rules
    ? [rules.minNights > 1 && `Minimum stay: ${rules.minNights} nights`, rules.maxNights < 30 && `Maximum stay: ${rules.maxNights} nights`]
        .filter(Boolean)
        .join(' · ')
    : ''
  const rangeText = range.checkIn
    ? `${formatDay(range.checkIn, LONG_DATE)}${range.checkOut ? ` – ${formatDay(range.checkOut, LONG_DATE)}` : ''}`
    : stayHint || 'Add your travel dates for exact pricing'

  const calendar = availability.isError ? (
    <p className="text-sm text-red-600 py-6">
      Couldn't load availability.{' '}
      <button type="button" className="underline font-semibold" onClick={() => availability.refetch()}>Try again</button>
    </p>
  ) : rules ? (
    <DateRangePicker value={range} onChange={pickDates} rules={rules} />
  ) : (
    <div className="h-72 rounded-xl bg-gray-100 animate-pulse" aria-label="Loading availability" />
  )

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6">
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
        <div className="md:col-span-2 space-y-6 min-w-0">
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
          <section className="pt-6 border-t border-ab-border" aria-labelledby="dates-heading">
            <h3 id="dates-heading" className="text-xl font-semibold">
              {range.checkIn && range.checkOut ? `${rangeHeading(range)} in ${data.city}` : rangeHeading(range)}
            </h3>
            <p className="text-sm text-ab-muted mt-1 mb-4">{rangeText}</p>
            {calendar}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={clearDates}
                disabled={!range.checkIn}
                className="text-sm font-semibold underline px-2 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                Clear dates
              </button>
            </div>
          </section>
          <div>
            <h3 className="font-semibold mb-3">Reviews</h3>
            {data.reviews.map((r, i) => (
              <p key={i} className="text-sm border-b py-2"><b>{r.user.firstName}</b> ★{r.rating} — {r.content}</p>
            ))}
          </div>
        </div>
        <div className="md:col-span-1">
          <div ref={card} className="relative md:sticky md:top-24 border border-ab-border rounded-xl shadow-lg p-6 bg-white">
            <p className="text-xl">
              {nights > 0 ? (
                <><span className="font-semibold">${total}</span> <span className="text-ab-muted text-base font-normal">for {nights} night{nights === 1 ? '' : 's'}</span></>
              ) : (
                <><span className="font-semibold">${data.pricePerNight}</span> <span className="text-ab-muted text-base font-normal">night</span></>
              )}
            </p>
            <div className="border border-ab-border rounded-lg mt-4 text-sm">
              <div className="grid grid-cols-2 border-b border-ab-border">
                {(['checkIn', 'checkOut'] as const).map((field) => {
                  const value = range[field]
                  // Outline whichever field the next click in the calendar will fill.
                  const active = pickerOpen && (field === 'checkIn' ? !range.checkIn || !!range.checkOut : !!range.checkIn && !range.checkOut)
                  return (
                    <button
                      key={field}
                      type="button"
                      aria-expanded={pickerOpen}
                      onClick={() => setPickerOpen((o) => !o)}
                      className={`p-2 text-left rounded-lg ${field === 'checkIn' ? 'border-r border-ab-border' : ''} ${active ? 'ring-2 ring-ab-text ring-inset' : ''}`}
                    >
                      <span className="text-[10px] font-bold block tracking-wide">{field === 'checkIn' ? 'CHECK-IN' : 'CHECKOUT'}</span>
                      <span className={value ? '' : 'text-ab-muted'}>
                        {value ? formatDay(value, { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'Add date'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <label className="p-2 block">
                <span className="text-[10px] font-bold block tracking-wide">GUESTS</span>
                <input
                  type="number"
                  min={1}
                  max={data.maxGuests}
                  value={guests}
                  onChange={(e) => setGuests(Math.min(data.maxGuests, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-full outline-none"
                />
              </label>
            </div>
            {pickerOpen && (
              <>
                {/* Phones get a bottom sheet over a dimmed page; wider screens a popover beside the card. */}
                <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden onClick={() => setPickerOpen(false)} />
                <div
                  role="dialog"
                  aria-label="Choose dates"
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-20 sm:z-30 sm:max-h-none sm:overflow-visible sm:w-[min(680px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-ab-border sm:p-6"
                >
                  <div className="mb-4">
                    <p className="text-lg font-semibold">{rangeHeading(range)}</p>
                    <p className="text-sm text-ab-muted">{rangeText}</p>
                  </div>
                  {calendar}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={clearDates}
                      disabled={!range.checkIn}
                      className="text-sm font-semibold underline px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                    >
                      Clear dates
                    </button>
                    <Button className="bg-ab-text hover:bg-black" onClick={() => setPickerOpen(false)}>Close</Button>
                  </div>
                </div>
              </>
            )}
            {isOwnListing ? (
              <Link to={`/host/calendar?listing=${data.id}`}><Button className="w-full mt-4 rounded-lg">Manage your calendar</Button></Link>
            ) : user ? (
              <Button
                className="w-full mt-4 rounded-lg bg-ab-primary hover:bg-ab-primary-hover"
                disabled={book.isPending}
                onClick={() => (range.checkIn && range.checkOut ? book.mutate() : setPickerOpen(true))}
              >
                {book.isPending ? 'Reserving…' : range.checkIn && range.checkOut ? 'Reserve' : 'Check availability'}
              </Button>
            ) : (
              <Link to="/login"><Button className="w-full mt-4">Log in to book</Button></Link>
            )}
            {book.isError && <p role="alert" className="text-sm text-red-600 mt-3">{book.error.message}</p>}
            <Button variant="secondary" className="w-full mt-2 rounded-lg" onClick={() => wishlist.mutate()}>Save to wishlist</Button>
            {nights > 0 && (
              <div className="text-sm mt-4 space-y-2">
                <p className="text-center text-ab-muted">You won't be charged yet</p>
                <p className="flex justify-between">
                  <span className="underline">${data.pricePerNight} x {nights} night{nights === 1 ? '' : 's'}</span>
                  <span>${total}</span>
                </p>
                <p className="flex justify-between font-semibold border-t border-ab-border pt-3"><span>Total</span><span>${total}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
