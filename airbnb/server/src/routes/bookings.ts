import { Router } from 'express'
import { BookingStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { addDays, dayKeySchema, nightsBetween, parseDayKey, todayUtc } from '../lib/dates.js'
import { zodMessage } from '../lib/validate.js'
import { calendarTransaction, findConflicts } from '../services/availability.js'

export const bookingsRouter = Router()
bookingsRouter.use(requireAuth)

bookingsRouter.get('/trips', async (req: AuthRequest, res) => {
  const guestId = req.userId!
  const now = new Date()
  const bookings = await prisma.booking.findMany({
    where: { guestId },
    include: { listing: { include: { host: true } } },
    orderBy: { checkIn: 'desc' },
  })
  res.json({
    upcoming: bookings.filter((b) => b.checkIn >= now && b.status !== BookingStatus.CANCELLED),
    past: bookings.filter((b) => b.checkOut < now || b.status === BookingStatus.COMPLETED),
  })
})

bookingsRouter.get('/host', async (req: AuthRequest, res) => {
  const hostId = req.userId!
  const bookings = await prisma.booking.findMany({
    where: { listing: { hostId } },
    include: { listing: true, guest: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    bookings.map((b) => ({
      ...b,
      guest: toPublicUser(b.guest),
    })),
  )
})

const bookingSchema = z
  .object({
    listingId: z.string().min(1),
    checkIn: dayKeySchema,
    checkOut: dayKeySchema,
    guests: z.number().int().min(1).max(16).default(1),
  })
  .refine(({ checkIn, checkOut }) => checkOut > checkIn, { message: 'Check-out must be after check-in', path: ['checkOut'] })

/** How far ahead guests may book. */
const BOOKING_HORIZON_DAYS = 365

bookingsRouter.post('/', async (req: AuthRequest, res) => {
  const body = bookingSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const { listingId, checkIn, checkOut, guests } = body.data
  const listing = await prisma.listing.findUnique({ where: { id: listingId } })
  if (!listing) return res.status(404).json({ message: 'Listing not found' })
  if (listing.hostId === req.userId) return res.status(403).json({ message: "You can't book your own listing" })

  const inDate = parseDayKey(checkIn)
  const outDate = parseDayKey(checkOut)
  const nights = nightsBetween(inDate, outDate)
  const today = todayUtc()
  // One day of slack: a guest west of UTC is still on "yesterday" when the UTC date rolls over.
  if (inDate < addDays(today, -1)) return res.status(400).json({ message: 'Check-in date has already passed' })
  if (inDate > addDays(today, BOOKING_HORIZON_DAYS)) {
    return res.status(400).json({ message: 'Bookings open up to a year in advance' })
  }
  if (guests > listing.maxGuests) {
    return res.status(400).json({ message: `This place allows up to ${listing.maxGuests} guests` })
  }
  if (nights < listing.minNights) {
    return res.status(400).json({ message: `Minimum stay is ${listing.minNights} nights` })
  }
  if (nights > listing.maxNights) {
    return res.status(400).json({ message: `Maximum stay is ${listing.maxNights} nights` })
  }

  // Check and insert as one calendar write so two guests racing for the same nights can't both win.
  const booking = await calendarTransaction(listing.id, async (tx) => {
    const { bookings, blocked } = await findConflicts(tx, listing.id, inDate, outDate)
    if (bookings.length || blocked.length) return null
    return tx.booking.create({
      data: {
        listingId,
        guestId: req.userId!,
        checkIn: inDate,
        checkOut: outDate,
        guests,
        totalPrice: nights * listing.pricePerNight,
        status: BookingStatus.CONFIRMED,
      },
      include: { listing: true },
    })
  })
  if (!booking) {
    return res.status(409).json({ message: 'Those dates are no longer available. Please pick different nights.' })
  }
  await prisma.notification.create({
    data: {
      userId: listing.hostId,
      actorId: req.userId!,
      type: 'BOOKING_REQUEST',
      title: 'New reservation',
      body: `${nights} night stay confirmed`,
      link: '/host/calendar',
    },
  })
  res.status(201).json(booking)
})

bookingsRouter.post('/:id/cancel', async (req: AuthRequest, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: param(req, 'id') },
    include: { listing: true },
  })
  if (!booking) return res.status(404).json({ message: 'Not found' })
  if (booking.guestId !== req.userId! && booking.listing.hostId !== req.userId!) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
  })
  res.json({ ok: true })
})

bookingsRouter.post('/:id/review', async (req: AuthRequest, res) => {
  const { rating, content } = req.body as { rating: number; content: string }
  const booking = await prisma.booking.findUnique({
    where: { id: param(req, 'id') },
    include: { listing: true },
  })
  if (!booking || booking.guestId !== req.userId!) return res.status(403).json({ message: 'Forbidden' })
  const review = await prisma.review.create({
    data: {
      listingId: booking.listingId,
      userId: req.userId!,
      bookingId: booking.id,
      rating: Math.min(5, Math.max(1, rating)),
      content,
    },
    include: { user: true },
  })
  await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.COMPLETED } })
  res.status(201).json({ ...review, user: toPublicUser(review.user) })
})
