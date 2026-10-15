import { Router } from 'express'
import { BookingStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

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

bookingsRouter.post('/', async (req: AuthRequest, res) => {
  const { listingId, checkIn, checkOut, guests } = req.body as {
    listingId: string
    checkIn: string
    checkOut: string
    guests: number
  }
  const listing = await prisma.listing.findUnique({ where: { id: listingId } })
  if (!listing) return res.status(404).json({ message: 'Listing not found' })
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / 86400000))
  const totalPrice = nights * listing.pricePerNight
  const booking = await prisma.booking.create({
    data: {
      listingId,
      guestId: req.userId!,
      checkIn: inDate,
      checkOut: outDate,
      guests: guests ?? 1,
      totalPrice,
      status: BookingStatus.CONFIRMED,
    },
    include: { listing: true },
  })
  await prisma.notification.create({
    data: {
      userId: listing.hostId,
      actorId: req.userId!,
      type: 'BOOKING_REQUEST',
      title: 'New reservation',
      body: `${nights} night stay confirmed`,
      link: '/host',
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
