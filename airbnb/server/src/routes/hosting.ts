import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { addDays, dayKeySchema, eachNight, nightsBetween, parseDayKey, todayUtc, toDayKey, windowSchema } from '../lib/dates.js'
import { zodMessage } from '../lib/validate.js'
import { calendarTransaction, findConflicts } from '../services/availability.js'

/** Host-side calendar tools. Every route here is scoped to listings the signed-in user owns. */
export const hostingRouter = Router()
hostingRouter.use(requireAuth)

/** Longest stretch a host can block or open in one go. */
const MAX_RANGE_NIGHTS = 180

const rangeFields = z.object({ start: dayKeySchema, end: dayKeySchema })

/** Nights are [start, end), so `end` is the morning after the last selected night. */
function checkRange({ start, end }: { start: string; end: string }, ctx: z.RefinementCtx) {
  if (end <= start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'end must be after start', path: ['end'] })
  } else if (nightsBetween(parseDayKey(start), parseDayKey(end)) > MAX_RANGE_NIGHTS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `You can change at most ${MAX_RANGE_NIGHTS} nights at once`, path: ['end'] })
  }
}

const rangeSchema = rangeFields.superRefine(checkRange)

const blockSchema = rangeFields
  .extend({ note: z.string().trim().max(120, 'Keep the note under 120 characters').default('') })
  .superRefine(checkRange)

const settingsSchema = z
  .object({
    minNights: z.number().int().min(1).max(365),
    maxNights: z.number().int().min(1).max(365),
  })
  .refine(({ minNights, maxNights }) => maxNights >= minNights, {
    message: 'Maximum stay must be at least the minimum stay',
    path: ['maxNights'],
  })

/** Loads the listing in `:id` if the caller hosts it; otherwise answers 404/403 and returns null. */
async function ownedListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.findUnique({ where: { id: param(req, 'id') } })
  if (!listing) {
    res.status(404).json({ message: 'Listing not found' })
    return null
  }
  if (listing.hostId !== req.userId) {
    res.status(403).json({ message: 'Only the host can manage this calendar' })
    return null
  }
  return listing
}

function calendarListing(listing: {
  id: string
  title: string
  city: string
  country: string
  pricePerNight: number
  minNights: number
  maxNights: number
  photos: unknown
}) {
  const photos = Array.isArray(listing.photos) ? (listing.photos as string[]) : []
  return {
    id: listing.id,
    title: listing.title,
    city: listing.city,
    country: listing.country,
    pricePerNight: listing.pricePerNight,
    minNights: listing.minNights,
    maxNights: listing.maxNights,
    imageUrl: photos[0] ?? 'https://picsum.photos/seed/default/800/600',
  }
}

hostingRouter.get('/listings', async (req: AuthRequest, res) => {
  const listings = await prisma.listing.findMany({
    where: { hostId: req.userId! },
    orderBy: { createdAt: 'asc' },
  })
  res.json(listings.map(calendarListing))
})

hostingRouter.get('/listings/:id/calendar', async (req: AuthRequest, res) => {
  const range = windowSchema.safeParse(req.query)
  if (!range.success) return res.status(400).json({ message: zodMessage(range.error) })
  const listing = await ownedListing(req, res)
  if (!listing) return
  const { start, end } = range.data
  const { bookings, blocked } = await findConflicts(prisma, listing.id, start, end)
  res.json({
    listing: calendarListing(listing),
    from: toDayKey(start),
    to: toDayKey(end),
    bookings: bookings.map((b) => ({
      id: b.id,
      checkIn: toDayKey(b.checkIn),
      checkOut: toDayKey(b.checkOut),
      guests: b.guests,
      totalPrice: b.totalPrice,
      status: b.status,
      guest: b.guest,
    })),
    blocked: blocked.map((n) => ({ date: toDayKey(n.date), note: n.note })),
  })
})

hostingRouter.post('/listings/:id/blocks', async (req: AuthRequest, res) => {
  const body = blockSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const listing = await ownedListing(req, res)
  if (!listing) return
  const start = parseDayKey(body.data.start)
  const end = parseDayKey(body.data.end)
  // One day of slack: a host west of UTC is still on "yesterday" when the UTC date rolls over.
  if (start < addDays(todayUtc(), -1)) return res.status(400).json({ message: "Past nights can't be blocked" })

  // Check and write as one calendar write so a reservation can't land on these nights in between.
  const outcome = await calendarTransaction(listing.id, async (tx) => {
    const { bookings } = await findConflicts(tx, listing.id, start, end)
    const conflict = bookings[0]
    if (conflict) return { conflict }
    const nights = eachNight(start, end)
    // Re-blocking an already closed night just refreshes its note.
    await tx.blockedNight.deleteMany({ where: { listingId: listing.id, date: { gte: start, lt: end } } })
    await tx.blockedNight.createMany({
      data: nights.map((date) => ({ listingId: listing.id, date, note: body.data.note })),
    })
    return { blocked: nights.length }
  })
  if (outcome.conflict) {
    const b = outcome.conflict
    return res.status(409).json({
      message: `${b.guest.firstName} is booked ${toDayKey(b.checkIn)} → ${toDayKey(b.checkOut)}; reserved nights can't be blocked`,
    })
  }
  res.status(201).json({ blocked: outcome.blocked })
})

hostingRouter.delete('/listings/:id/blocks', async (req: AuthRequest, res) => {
  const range = rangeSchema.safeParse(req.query)
  if (!range.success) return res.status(400).json({ message: zodMessage(range.error) })
  const listing = await ownedListing(req, res)
  if (!listing) return
  const { count } = await prisma.blockedNight.deleteMany({
    where: { listingId: listing.id, date: { gte: parseDayKey(range.data.start), lt: parseDayKey(range.data.end) } },
  })
  res.json({ unblocked: count })
})

hostingRouter.patch('/listings/:id/settings', async (req: AuthRequest, res) => {
  const body = settingsSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const listing = await ownedListing(req, res)
  if (!listing) return
  const updated = await prisma.listing.update({ where: { id: listing.id }, data: body.data })
  res.json(calendarListing(updated))
})
