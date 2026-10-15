import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const pagesRouter = Router()

pagesRouter.get('/:slug', async (req, res) => {
  const page = await prisma.page.findUnique({
    where: { slug: param(req, 'slug') },
    include: {
      reviews: { include: { user: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { reviews: true } },
    },
  })
  if (!page) return res.status(404).json({ message: 'Not found' })
  const avg =
    page.reviews.length > 0
      ? page.reviews.reduce((s, r) => s + r.rating, 0) / page.reviews.length
      : 0
  res.json({
    page,
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: page._count.reviews,
    recentReviews: page.reviews.map((r) => ({ ...r, user: toPublicUser(r.user) })),
  })
})

pagesRouter.get('/:slug/reviews', async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: param(req, 'slug') } })
  if (!page) return res.status(404).json({ message: 'Not found' })
  const reviews = await prisma.review.findMany({
    where: { pageId: page.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(reviews.map((r) => ({ ...r, user: toPublicUser(r.user) })))
})

pagesRouter.post('/:slug/reviews', requireAuth, async (req: AuthRequest, res) => {
  const page = await prisma.page.findUnique({ where: { slug: param(req, 'slug') } })
  if (!page) return res.status(404).json({ message: 'Not found' })
  const { rating, content } = req.body as { rating: number; content: string }
  const review = await prisma.review.create({
    data: {
      pageId: page.id,
      userId: req.userId!,
      rating: Math.min(5, Math.max(1, rating)),
      content,
    },
    include: { user: true },
  })
  res.status(201).json({ ...review, user: toPublicUser(review.user) })
})
