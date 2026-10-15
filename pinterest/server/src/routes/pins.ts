import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichPin } from '../services/pins.js'

export const pinsRouter = Router()
pinsRouter.use(requireAuth)

pinsRouter.get('/feed', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const follows = await prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } })
  const ids = [userId, ...follows.map((f) => f.followingId)]
  const pins = await prisma.pin.findMany({
    where: { authorId: { in: ids } },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  if (pins.length < 20) {
    const more = await prisma.pin.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    const seen = new Set(pins.map((p) => p.id))
    for (const p of more) {
      if (!seen.has(p.id)) pins.push(p)
    }
  }
  res.json({ pins: await Promise.all(pins.map((p) => enrichPin(p, userId))) })
})

pinsRouter.get('/explore', async (req: AuthRequest, res) => {
  const pins = await prisma.pin.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 48,
  })
  res.json({ pins: await Promise.all(pins.map((p) => enrichPin(p, req.userId!))) })
})

pinsRouter.post('/', async (req: AuthRequest, res) => {
  const { title, description, imageUrl, linkUrl, boardId } = req.body as {
    title: string
    description?: string
    imageUrl: string
    linkUrl?: string
    boardId?: string
  }
  if (!title?.trim() || !imageUrl) return res.status(400).json({ message: 'title and imageUrl required' })
  const pin = await prisma.pin.create({
    data: {
      authorId: req.userId!,
      boardId: boardId ?? null,
      title: title.trim(),
      description: description?.trim() ?? '',
      imageUrl,
      linkUrl: linkUrl ?? null,
    },
    include: { author: true },
  })
  res.status(201).json({ pin: await enrichPin(pin, req.userId!) })
})

pinsRouter.get('/:id', async (req: AuthRequest, res) => {
  const pin = await prisma.pin.findUnique({
    where: { id: param(req, 'id') },
    include: { author: true },
  })
  if (!pin) return res.status(404).json({ message: 'Not found' })
  const comments = await prisma.pinComment.findMany({
    where: { pinId: pin.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  res.json({
    pin: await enrichPin(pin, req.userId!),
    comments: comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: toPublicUser(c.user) })),
  })
})

pinsRouter.post('/:id/save', async (req: AuthRequest, res) => {
  const pinId = param(req, 'id')
  const { boardId } = req.body as { boardId: string }
  if (!boardId) return res.status(400).json({ message: 'boardId required' })
  const board = await prisma.board.findFirst({ where: { id: boardId, userId: req.userId! } })
  if (!board) return res.status(403).json({ message: 'Invalid board' })
  await prisma.pinSave.upsert({
    where: { userId_pinId_boardId: { userId: req.userId!, pinId, boardId } },
    create: { userId: req.userId!, pinId, boardId },
    update: {},
  })
  res.json({ saved: true })
})

pinsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const { content } = req.body as { content: string }
  if (!content?.trim()) return res.status(400).json({ message: 'content required' })
  const comment = await prisma.pinComment.create({
    data: { pinId: param(req, 'id'), userId: req.userId!, content: content.trim() },
    include: { user: true },
  })
  res.status(201).json({ comment: { id: comment.id, content: comment.content, user: toPublicUser(comment.user) } })
})
