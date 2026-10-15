import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { enrichPin } from '../services/pins.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const boardsRouter = Router()
boardsRouter.use(requireAuth)

boardsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = String(req.query.userId ?? req.userId)
  const boards = await prisma.board.findMany({
    where: { userId, isSecret: userId === req.userId ? undefined : false },
    include: { _count: { select: { pins: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    boards: boards.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      coverUrl: b.coverUrl,
      isSecret: b.isSecret,
      pinCount: b._count.pins,
    })),
  })
})

boardsRouter.post('/', async (req: AuthRequest, res) => {
  const { name, description, coverUrl, isSecret } = req.body as {
    name: string
    description?: string
    coverUrl?: string
    isSecret?: boolean
  }
  if (!name?.trim()) return res.status(400).json({ message: 'name required' })
  const board = await prisma.board.create({
    data: {
      userId: req.userId!,
      name: name.trim(),
      description: description?.trim() ?? '',
      coverUrl: coverUrl ?? null,
      isSecret: !!isSecret,
    },
  })
  res.status(201).json({ board })
})

boardsRouter.get('/:id', async (req: AuthRequest, res) => {
  const board = await prisma.board.findUnique({
    where: { id: param(req, 'id') },
    include: { pins: { include: { author: true }, orderBy: { createdAt: 'desc' } } },
  })
  if (!board) return res.status(404).json({ message: 'Not found' })
  if (board.isSecret && board.userId !== req.userId) return res.status(403).json({ message: 'Private board' })
  res.json({
    board: { id: board.id, name: board.name, description: board.description, coverUrl: board.coverUrl },
    pins: await Promise.all(board.pins.map((p) => enrichPin(p, req.userId!))),
  })
})
