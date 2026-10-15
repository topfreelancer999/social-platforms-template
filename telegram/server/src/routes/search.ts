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
      .filter((u) => contains(u.username) || contains(u.displayName) || contains(u.phone))
      .map((u) => ({ ...toPublicUser(u), isOnline: u.isOnline, lastSeen: u.lastSeen }))
  }
  if (type === 'all' || type === 'channels') {
    result.channels = (await prisma.channel.findMany()).filter(
      (c) => contains(c.name) || contains(c.slug) || contains(c.description),
    )
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany({ where: { privacy: 'PUBLIC' } })).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  if (type === 'all' || type === 'messages') {
    const msgs = await prisma.message.findMany({ take: 30 })
    result.messages = msgs.filter((m) => contains(m.content)).map((m) => ({ id: m.id, content: m.content }))
  }
  res.json(result)
})
