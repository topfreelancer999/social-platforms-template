import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const momentsRouter = Router()
momentsRouter.use(requireAuth)

async function enrichMoment(momentId: string, viewerId: string) {
  const moment = await prisma.moment.findUnique({
    where: { id: momentId },
    include: {
      author: true,
      likes: true,
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
      _count: { select: { likes: true, comments: true } },
    },
  })
  if (!moment) return null
  return {
    id: moment.id,
    content: moment.content,
    imageUrl: moment.imageUrl,
    location: moment.location,
    createdAt: moment.createdAt,
    author: toPublicUser(moment.author),
    likeCount: moment._count.likes,
    commentCount: moment._count.comments,
    liked: moment.likes.some((l) => l.userId === viewerId),
    comments: moment.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: toPublicUser(c.author),
    })),
  }
}

momentsRouter.get('/feed', async (req: AuthRequest, res) => {
  const viewerId = req.userId!
  const moments = await prisma.moment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const enriched = []
  for (const m of moments) {
    const e = await enrichMoment(m.id, viewerId)
    if (e) enriched.push(e)
  }
  res.json({ moments: enriched })
})

momentsRouter.post('/', async (req: AuthRequest, res) => {
  const { content, imageUrl, location } = req.body as { content?: string; imageUrl?: string; location?: string }
  const moment = await prisma.moment.create({
    data: {
      authorId: req.userId!,
      content: content?.trim() ?? '',
      imageUrl: imageUrl ?? null,
      location: location?.trim() ?? '',
    },
  })
  res.status(201).json(await enrichMoment(moment.id, req.userId!))
})

momentsRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const momentId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.momentLike.findUnique({
    where: { momentId_userId: { momentId, userId } },
  })
  if (existing) await prisma.momentLike.delete({ where: { id: existing.id } })
  else await prisma.momentLike.create({ data: { momentId, userId } })
  res.json(await enrichMoment(momentId, userId))
})

momentsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const momentId = param(req, 'id')
  await prisma.momentComment.create({
    data: { momentId, authorId: req.userId!, content: (req.body as { content: string }).content },
  })
  res.json(await enrichMoment(momentId, req.userId!))
})
