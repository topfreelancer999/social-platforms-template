import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { addDays, addMonths, diffDays, formatDay, monthGrid, monthLabel, monthStart, todayKey, WEEKDAYS, type DayKey } from '@/lib/dates'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { HostTabs } from './HostTabs'

interface HostListing {
  id: string
  title: string
  city: string
  country: string
  pricePerNight: number
  minNights: number
  maxNights: number
  imageUrl: string
}

interface CalendarBooking {
  id: string
  checkIn: DayKey
  checkOut: DayKey
  guests: number
  totalPrice: number
  status: string
  guest: { id: string; firstName: string; lastName: string; username: string; avatarUrl: string }
}

interface CalendarData {
  listing: HostListing
  bookings: CalendarBooking[]
  blocked: { date: DayKey; note: string }[]
}

/** Selected nights, inclusive on both ends (the API takes `end + 1` as the exclusive bound). */
interface Selection {
  start: DayKey
  end: DayKey
}

const BLOCKED_BG = 'bg-[repeating-linear-gradient(135deg,#f7f7f7_0,#f7f7f7_6px,#e4e4e4_6px,#e4e4e4_8px)]'

function nightsLabel(n: number) {
  return `${n} night${n === 1 ? '' : 's'}`
}

export function HostCalendarPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [today] = useState(todayKey)
  const [month, setMonth] = useState(() => monthStart(todayKey()))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const listings = useQuery({
    queryKey: ['hosting-listings'],
    queryFn: () => api<HostListing[]>('/hosting/listings', { headers: authHeaders(token) }),
  })
  const listingId = params.get('listing') ?? listings.data?.[0]?.id ?? null
  const calendar = useQuery({
    queryKey: ['host-calendar', listingId, month],
    queryFn: () =>
      api<CalendarData>(`/hosting/listings/${listingId}/calendar?from=${month}&to=${addMonths(month, 1)}`, {
        headers: authHeaders(token),
      }),
    enabled: !!listingId,
    placeholderData: keepPreviousData,
  })

  const resetSelection = () => {
    setSelection(null)
    setBookingId(null)
    setNote('')
  }
  const onChanged = (message: string) => {
    qc.invalidateQueries({ queryKey: ['host-calendar', listingId] })
    qc.invalidateQueries({ queryKey: ['availability', listingId] })
    resetSelection()
    setFlash(message)
  }
  const block = useMutation({
    mutationFn: (s: Selection) =>
      api<{ blocked: number }>(`/hosting/listings/${listingId}/blocks`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ start: s.start, end: addDays(s.end, 1), note }),
      }),
    onSuccess: (r) => onChanged(`${nightsLabel(r.blocked)} blocked`),
  })
  const unblock = useMutation({
    mutationFn: (s: Selection) =>
      api<{ unblocked: number }>(`/hosting/listings/${listingId}/blocks?start=${s.start}&end=${addDays(s.end, 1)}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
    onSuccess: (r) => onChanged(`${nightsLabel(r.unblocked)} opened`),
  })

  const data = calendar.data
  const { bookingByNight, blockedByNight } = useMemo(() => {
    const bookingByNight = new Map<DayKey, CalendarBooking>()
    for (const b of data?.bookings ?? []) {
      for (let d = b.checkIn; d < b.checkOut; d = addDays(d, 1)) bookingByNight.set(d, b)
    }
    return { bookingByNight, blockedByNight: new Map((data?.blocked ?? []).map((n) => [n.date, n.note])) }
  }, [data])

  const pickListing = (id: string) => {
    resetSelection()
    setFlash(null)
    setParams({ listing: id })
  }
  const goMonth = (delta: number) => {
    resetSelection()
    setFlash(null)
    setMonth((m) => addMonths(m, delta))
  }

  // While a single night is selected, a later click extends the range unless a reservation is in the way.
  const extending = selection && selection.start === selection.end ? selection.start : null
  const reachable = (day: DayKey) => {
    if (!extending || day <= extending) return true
    for (let d = extending; d <= day; d = addDays(d, 1)) if (bookingByNight.has(d)) return false
    return true
  }
  const clickDay = (day: DayKey) => {
    setFlash(null)
    block.reset()
    unblock.reset()
    const booking = bookingByNight.get(day)
    if (booking) {
      setSelection(null)
      setBookingId(booking.id)
      return
    }
    setBookingId(null)
    if (extending && day > extending && reachable(day)) {
      setSelection({ start: extending, end: day })
    } else {
      setSelection({ start: day, end: day })
      setNote(blockedByNight.get(day) ?? '')
    }
  }

  if (listings.isPending) {
    return (
      <Shell>
        <div className="h-10 w-64 rounded-lg bg-gray-100 animate-pulse mb-6" />
        <div className="h-[420px] rounded-xl bg-gray-100 animate-pulse" />
      </Shell>
    )
  }
  if (listings.isError) {
    return (
      <Shell>
        <p className="text-red-600 text-sm">
          Couldn't load your listings.{' '}
          <button type="button" className="underline font-semibold" onClick={() => listings.refetch()}>Try again</button>
        </p>
      </Shell>
    )
  }
  if (!listings.data.length) {
    return (
      <Shell>
        <div className="text-center py-16 border border-dashed border-ab-border rounded-2xl">
          <p className="text-lg font-semibold">No listings yet</p>
          <p className="text-ab-muted text-sm mt-1">Create a listing to start managing its calendar.</p>
          <Link to="/host/listing/new"><Button className="mt-4">Create a listing</Button></Link>
        </div>
      </Shell>
    )
  }

  const listing = listings.data.find((l) => l.id === listingId) ?? data?.listing
  const selectedBooking = bookingId ? data?.bookings.find((b) => b.id === bookingId) ?? null : null
  const selectedNights = selection ? diffDays(selection.start, selection.end) + 1 : 0
  const blockedInSelection = selection
    ? Array.from({ length: selectedNights }, (_, i) => addDays(selection.start, i)).filter((d) => blockedByNight.has(d)).length
    : 0
  const busy = block.isPending || unblock.isPending
  const mutationError = block.error ?? unblock.error
  const cells = monthGrid(month)
  const nextMonth = addMonths(month, 1)
  const monthBookings = (data?.bookings ?? []).filter((b) => b.status !== 'CANCELLED')

  return (
    <Shell>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Calendar</h1>
          <p className="text-ab-muted text-sm mt-1">Block nights you can't host. Guests can't book blocked or reserved nights.</p>
        </div>
        <label className="block sm:w-80">
          <span className="sr-only">Listing</span>
          <select
            value={listingId ?? ''}
            onChange={(e) => pickListing(e.target.value)}
            className="w-full border border-ab-border rounded-full px-4 py-2.5 text-sm font-semibold bg-white truncate"
          >
            {listings.data.map((l) => (
              <option key={l.id} value={l.id}>{l.title} · {l.city}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= monthStart(today)}
                onClick={() => goMonth(-1)}
                className="p-2 rounded-full border border-ab-border hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={month >= addMonths(monthStart(today), 12)}
                onClick={() => goMonth(1)}
                className="p-2 rounded-full border border-ab-border hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {calendar.isError ? (
            <div className="h-80 flex flex-col items-center justify-center text-center border border-ab-border rounded-xl px-4">
              <p className="text-sm text-red-600">{calendar.error.message}</p>
              <button type="button" className="underline text-sm font-semibold mt-2" onClick={() => calendar.refetch()}>Try again</button>
            </div>
          ) : (
            <div className={cn('border-l border-t border-ab-border rounded-xl overflow-hidden', calendar.isFetching && 'opacity-60')}>
              <div className="grid grid-cols-7 text-[11px] font-semibold text-ab-muted text-center">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="py-2 border-r border-b border-ab-border">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (!day) return <span key={`blank-${i}`} className="border-r border-b border-ab-border bg-gray-50" />
                  const booking = bookingByNight.get(day)
                  const blockedNote = blockedByNight.get(day)
                  const blocked = blockedNote !== undefined
                  const past = day < today
                  const selected = !!selection && day >= selection.start && day <= selection.end
                  // Reservations stay clickable (even past ones) so the host can open their details.
                  const disabled = !booking && (past || !reachable(day))
                  const column = i % 7
                  // Draw each reservation once per week row as a pill spanning its nights.
                  const barStart = booking && (day === booking.checkIn || column === 0 || day === month)
                  const span = booking
                    ? Math.min(diffDays(day, booking.checkOut), 7 - column, diffDays(day, nextMonth))
                    : 0
                  const label = [
                    formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' }),
                    booking ? `reserved by ${booking.guest.firstName}` : blocked ? `blocked${blockedNote ? `: ${blockedNote}` : ''}` : 'available',
                  ].join(', ')
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      aria-label={label}
                      aria-pressed={selected}
                      title={blocked && blockedNote ? blockedNote : undefined}
                      onClick={() => clickDay(day)}
                      className={cn(
                        'relative h-16 sm:h-24 border-r border-b border-ab-border p-1 sm:p-2 text-left align-top flex flex-col',
                        'enabled:hover:bg-gray-50 disabled:cursor-not-allowed',
                        blocked && !selected && BLOCKED_BG,
                        past && 'bg-gray-50 text-gray-300',
                        !past && disabled && 'text-gray-300',
                        selected && 'bg-ab-text text-white enabled:hover:bg-ab-text',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs sm:text-sm font-semibold leading-none',
                          day === today && 'underline underline-offset-4',
                          blocked && !selected && 'line-through text-ab-muted',
                        )}
                      >
                        {Number(day.slice(8))}
                      </span>
                      {!booking && !past && (
                        <span className={cn('mt-auto text-[10px] sm:text-xs truncate', selected ? 'text-white/80' : 'text-ab-muted')}>
                          {blocked ? (
                            <span className="inline-flex items-center gap-0.5"><Lock size={10} className="shrink-0" /><span className="hidden sm:inline">Blocked</span></span>
                          ) : (
                            `$${listing?.pricePerNight ?? ''}`
                          )}
                        </span>
                      )}
                      {barStart && booking && (
                        <span
                          className={cn(
                            'absolute z-10 bottom-1.5 left-0.5 h-6 sm:h-7 flex items-center gap-1 px-1 text-[11px] sm:text-xs font-semibold text-white overflow-hidden',
                            booking.id === bookingId ? 'bg-ab-primary' : past ? 'bg-gray-400' : 'bg-ab-text',
                            day === booking.checkIn && 'rounded-l-full',
                            diffDays(day, booking.checkOut) === span && 'rounded-r-full',
                          )}
                          style={{ width: `calc(${span * 100}% - 4px)` }}
                        >
                          <img src={booking.guest.avatarUrl} alt="" className="h-4 w-4 sm:h-5 sm:w-5 rounded-full shrink-0" />
                          <span className="truncate">{booking.guest.firstName}</span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-ab-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-ab-border bg-white" /> Available</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded-full bg-ab-text" /> Reserved</span>
            <span className="inline-flex items-center gap-1.5"><span className={cn('h-3 w-3 rounded-sm border border-ab-border', BLOCKED_BG)} /> Blocked</span>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 space-y-4">
          {flash && <p role="status" className="text-sm rounded-xl bg-green-50 text-green-800 px-4 py-3">{flash}</p>}
          {selectedBooking ? (
            <BookingPanel booking={selectedBooking} onClose={resetSelection} />
          ) : selection ? (
            <div className="border border-ab-border rounded-2xl p-5 shadow-sm">
              <p className="font-semibold">
                {formatDay(selection.start)}
                {selection.end !== selection.start && ` – ${formatDay(selection.end)}`}
              </p>
              <p className="text-sm text-ab-muted">
                {nightsLabel(selectedNights)}
                {blockedInSelection > 0 && ` · ${blockedInSelection} blocked`}
                {selection.start === selection.end && ' · tap another day to select a range'}
              </p>
              {blockedInSelection < selectedNights && (
                <label className="block mt-4">
                  <span className="text-xs font-semibold block mb-1">Private note (optional)</span>
                  <input
                    value={note}
                    maxLength={120}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Family visiting"
                    className="w-full border border-ab-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ab-text"
                  />
                </label>
              )}
              {blockedInSelection === selectedNights && blockedByNight.get(selection.start) && (
                <p className="text-sm mt-3 rounded-lg bg-gray-50 px-3 py-2">“{blockedByNight.get(selection.start)}”</p>
              )}
              {mutationError && <p role="alert" className="text-sm text-red-600 mt-3">{mutationError.message}</p>}
              <div className="flex flex-col gap-2 mt-4">
                {blockedInSelection < selectedNights && (
                  <Button className="bg-ab-text hover:bg-black" disabled={busy} onClick={() => block.mutate(selection)}>
                    {block.isPending ? 'Blocking…' : `Block ${nightsLabel(selectedNights)}`}
                  </Button>
                )}
                {blockedInSelection > 0 && (
                  <Button variant="secondary" disabled={busy} onClick={() => unblock.mutate(selection)}>
                    {unblock.isPending ? 'Opening…' : `Open ${nightsLabel(blockedInSelection)}`}
                  </Button>
                )}
                <Button variant="ghost" disabled={busy} onClick={resetSelection}>Clear selection</Button>
              </div>
            </div>
          ) : (
            listing && (
              <div className="border border-ab-border rounded-2xl p-5 shadow-sm">
                <div className="flex gap-3 items-center">
                  <img src={listing.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <Link to={`/listing/${listing.id}`} className="font-semibold hover:underline line-clamp-2">{listing.title}</Link>
                    <p className="text-sm text-ab-muted">${listing.pricePerNight} night · {listing.city}</p>
                  </div>
                </div>
                <p className="text-sm text-ab-muted mt-4">Select a night to block or reopen it, then tap a later day to select a range. Tap a reservation to see its details.</p>
                <StaySettings key={listing.id} listing={listing} />
              </div>
            )
          )}

          <div className="border border-ab-border rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Reservations in {formatDay(month, { month: 'long' })}</h3>
            {calendar.isPending ? (
              <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
            ) : monthBookings.length ? (
              <ul className="space-y-2">
                {monthBookings.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelection(null)
                        setFlash(null)
                        setBookingId(b.id)
                      }}
                      className={cn('w-full flex items-center gap-3 text-left rounded-xl p-2 hover:bg-gray-50', b.id === bookingId && 'bg-gray-100')}
                    >
                      <Avatar src={b.guest.avatarUrl} size="sm" />
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold block truncate">{b.guest.firstName} {b.guest.lastName}</span>
                        <span className="text-ab-muted">{formatDay(b.checkIn)} – {formatDay(b.checkOut)} · {nightsLabel(diffDays(b.checkIn, b.checkOut))}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ab-muted">No reservations this month.</p>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-8 pb-24 md:pb-8">
      <HostTabs />
      {children}
    </div>
  )
}

function BookingPanel({ booking, onClose }: { booking: CalendarBooking; onClose: () => void }) {
  const nights = diffDays(booking.checkIn, booking.checkOut)
  return (
    <div className="border border-ab-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar src={booking.guest.avatarUrl} size="lg" />
        <div className="min-w-0">
          <Link to={`/profile/${booking.guest.username}`} className="font-semibold hover:underline">
            {booking.guest.firstName} {booking.guest.lastName}
          </Link>
          <p className="text-sm text-ab-muted">{booking.status[0]}{booking.status.slice(1).toLowerCase()} reservation</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm mt-4">
        <div><dt className="text-ab-muted text-xs font-semibold">CHECK-IN</dt><dd>{formatDay(booking.checkIn, { weekday: 'short', month: 'short', day: 'numeric' })}</dd></div>
        <div><dt className="text-ab-muted text-xs font-semibold">CHECKOUT</dt><dd>{formatDay(booking.checkOut, { weekday: 'short', month: 'short', day: 'numeric' })}</dd></div>
        <div><dt className="text-ab-muted text-xs font-semibold">GUESTS</dt><dd>{booking.guests}</dd></div>
        <div><dt className="text-ab-muted text-xs font-semibold">PAYOUT</dt><dd>${booking.totalPrice} · {nightsLabel(nights)}</dd></div>
      </dl>
      <div className="flex flex-col gap-2 mt-4">
        <Link to="/messages"><Button variant="secondary" className="w-full">Message guest</Button></Link>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

function StaySettings({ listing }: { listing: HostListing }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [minNights, setMinNights] = useState(listing.minNights)
  const [maxNights, setMaxNights] = useState(listing.maxNights)
  const save = useMutation({
    mutationFn: () =>
      api<HostListing>(`/hosting/listings/${listing.id}/settings`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ minNights, maxNights }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosting-listings'] })
      qc.invalidateQueries({ queryKey: ['host-calendar', listing.id] })
      qc.invalidateQueries({ queryKey: ['availability', listing.id] })
    },
  })
  const dirty = minNights !== listing.minNights || maxNights !== listing.maxNights
  return (
    <form
      className="mt-5 pt-5 border-t border-ab-border"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <h3 className="font-semibold">Trip length</h3>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {([
          ['Minimum nights', minNights, setMinNights],
          ['Maximum nights', maxNights, setMaxNights],
        ] as const).map(([label, value, set]) => (
          <label key={label} className="block border border-ab-border rounded-lg px-3 py-2">
            <span className="text-[11px] font-semibold text-ab-muted block">{label}</span>
            <input
              type="number"
              min={1}
              max={365}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full outline-none text-sm font-semibold"
            />
          </label>
        ))}
      </div>
      {save.isError && <p role="alert" className="text-sm text-red-600 mt-2">{save.error.message}</p>}
      {save.isSuccess && !dirty && <p role="status" className="text-sm text-green-700 mt-2">Saved</p>}
      <Button type="submit" variant="secondary" className="w-full mt-3" disabled={!dirty || save.isPending}>
        {save.isPending ? 'Saving…' : 'Save trip length'}
      </Button>
    </form>
  )
}
