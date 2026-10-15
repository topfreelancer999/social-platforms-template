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

  if (type === 'all' || type === 'contacts') {
    const users = await prisma.user.findMany({ where: { id: { not: req.userId! } }, take: 50 })
    result.contacts = users
      .filter(
        (u) =>
          contains(u.displayName) ||
          contains(u.username) ||
          contains(u.phone) ||
          contains(`${u.firstName} ${u.lastName}`),
      )
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'messages') {
    const msgs = await prisma.message.findMany({
      take: 40,
      include: { sender: true, thread: { include: { participants: { include: { user: true } } } } },
    })
    result.messages = msgs
      .filter((m) => contains(m.content))
      .map((m) => ({
        id: m.id,
        content: m.content,
        threadId: m.threadId,
        sender: toPublicUser(m.sender),
      }))
  }
  if (type === 'all' || type === 'channels') {
    result.channels = (await prisma.channel.findMany()).filter(
      (c) => contains(c.name) || contains(c.description) || contains(c.slug),
    )
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  res.json(result)
})
