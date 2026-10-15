import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

function mapListing(listing: {
  id: string
  title: string
  city: string
  country: string
  pricePerNight: number
  photos: unknown
  reviews?: { rating: number }[]
}) {
  const photos = Array.isArray(listing.photos) ? (listing.photos as string[]) : []
  const ratings = listing.reviews ?? []
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0
  return {
    id: listing.id,
    title: listing.title,
    city: listing.city,
    country: listing.country,
    pricePerNight: listing.pricePerNight,
    photos,
    imageUrl: photos[0],
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: ratings.length,
  }
}

export const wishlistsRouter = Router()
wishlistsRouter.use(requireAuth)

wishlistsRouter.get('/', async (req: AuthRequest, res) => {
  let wishlist = await prisma.wishlist.findFirst({
    where: { userId: req.userId! },
    include: { items: { include: { listing: { include: { host: true, reviews: { select: { rating: true } } } } } } },
  })
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: req.userId!, name: 'Favorites' },
      include: { items: { include: { listing: { include: { host: true, reviews: { select: { rating: true } } } } } } },
    })
  }
  res.json({
    ...wishlist,
    items: wishlist.items.map((i) => ({ ...i, listing: mapListing({ ...i.listing, reviews: i.listing.reviews }) })),
  })
})

wishlistsRouter.post('/:listingId', async (req: AuthRequest, res) => {
  const listingId = param(req, 'listingId')
  let wishlist = await prisma.wishlist.findFirst({ where: { userId: req.userId! } })
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({ data: { userId: req.userId! } })
  }
  await prisma.wishlistItem.upsert({
    where: { wishlistId_listingId: { wishlistId: wishlist.id, listingId } },
    create: { wishlistId: wishlist.id, listingId },
    update: {},
  })
  res.json({ ok: true })
})

wishlistsRouter.delete('/:listingId', async (req: AuthRequest, res) => {
  const wishlist = await prisma.wishlist.findFirst({ where: { userId: req.userId! } })
  if (!wishlist) return res.json({ ok: true })
  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, listingId: param(req, 'listingId') },
  })
  res.json({ ok: true })
})
