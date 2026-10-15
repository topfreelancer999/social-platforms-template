import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { enrichPin } from '../services/pins.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}

  if (type === 'all' || type === 'pins') {
    const pins = await prisma.pin.findMany({ include: { author: true }, take: 40 })
    result.pins = await Promise.all(
      pins.filter((p) => contains(p.title) || contains(p.description)).map((p) => enrichPin(p, req.userId!)),
    )
  }
  if (type === 'all' || type === 'boards') {
    result.boards = (await prisma.board.findMany({ where: { isSecret: false } })).filter(
      (b) => contains(b.name) || contains(b.description),
    )
  }
  if (type === 'all' || type === 'users') {
    const users = await prisma.user.findMany({ where: { id: { not: req.userId! } }, take: 50 })
    result.users = users
      .filter((u) => contains(u.username) || contains(u.displayName) || contains(`${u.firstName} ${u.lastName}`))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'channels') {
    result.channels = (await prisma.channel.findMany()).filter(
      (c) => contains(c.name) || contains(c.slug) || contains(c.description),
    )
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  res.json(result)
})
