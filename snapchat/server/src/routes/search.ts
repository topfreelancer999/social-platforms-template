import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
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
  if (type === 'all' || type === 'snaps') {
    const snaps = await prisma.snap.findMany({ take: 30, include: { author: true } })
    result.snaps = snaps
      .filter((s) => contains(s.caption))
      .map((s) => ({ id: s.id, caption: s.caption, author: toPublicUser(s.author) }))
  }
  res.json(result)
})
