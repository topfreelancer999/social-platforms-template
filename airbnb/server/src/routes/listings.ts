import { Router } from 'express'
import { ListingType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const listingsRouter = Router()

function parsePhotos(photos: unknown): string[] {
  return Array.isArray(photos) ? (photos as string[]) : []
}

function enrichListing(listing: {
  id: string
  title: string
  description: string
  type: ListingType
  pricePerNight: number
  city: string
  country: string
  maxGuests: number
  bedrooms: number
  beds: number
  baths: number
  photos: unknown
  amenities: unknown
  host: import('@prisma/client').User
  reviews?: { rating: number }[]
}) {
  const photos = parsePhotos(listing.photos)
  const ratings = listing.reviews ?? []
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0
  return {
    ...listing,
    photos,
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    imageUrl: photos[0] ?? 'https://picsum.photos/seed/default/800/600',
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: ratings.length,
    host: toPublicUser(listing.host),
  }
}

listingsRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const city = String(req.query.city ?? '')
  const guests = Number(req.query.guests ?? 0)
  const priceMax = Number(req.query.priceMax ?? 0)
  const type = req.query.type as ListingType | undefined

  const where: Prisma.ListingWhereInput = {}
  if (city) where.city = { contains: city }
  if (type) where.type = type
  if (guests > 0) where.maxGuests = { gte: guests }
  if (priceMax > 0) where.pricePerNight = { lte: priceMax }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { city: { contains: q } },
      { country: { contains: q } },
    ]
  }

  const listings = await prisma.listing.findMany({
    where,
    take: 40,
    orderBy: { createdAt: 'desc' },
    include: { host: true, reviews: { select: { rating: true } } },
  })
  res.json(listings.map(enrichListing))
})

listingsRouter.get('/featured', async (_req, res) => {
  const listings = await prisma.listing.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: { host: true, reviews: { select: { rating: true } } },
  })
  res.json(listings.map(enrichListing))
})

listingsRouter.get('/:id', async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: param(req, 'id') },
    include: {
      host: true,
      reviews: { include: { user: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!listing) return res.status(404).json({ message: 'Not found' })
  res.json({
    ...enrichListing({ ...listing, reviews: listing.reviews.map((r) => ({ rating: r.rating })) }),
    reviews: listing.reviews.map((r) => ({
      ...r,
      user: toPublicUser(r.user),
    })),
  })
})

listingsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body as {
    title: string
    description: string
    type?: ListingType
    pricePerNight: number
    city: string
    country: string
    maxGuests?: number
    bedrooms?: number
    photos?: string[]
    amenities?: string[]
  }
  await prisma.user.update({ where: { id: req.userId! }, data: { isHost: true } })
  const listing = await prisma.listing.create({
    data: {
      hostId: req.userId!,
      title: body.title,
      description: body.description,
      type: body.type ?? ListingType.HOME,
      pricePerNight: body.pricePerNight,
      city: body.city,
      country: body.country,
      maxGuests: body.maxGuests ?? 2,
      bedrooms: body.bedrooms ?? 1,
      photos: body.photos ?? [`https://picsum.photos/seed/new${Date.now()}/800/600`],
      amenities: body.amenities ?? ['Wifi', 'Kitchen'],
    },
    include: { host: true, reviews: { select: { rating: true } } },
  })
  res.status(201).json(enrichListing(listing))
})
