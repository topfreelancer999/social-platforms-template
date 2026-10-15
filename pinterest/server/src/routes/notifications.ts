import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: true },
  })
  const unread = items.filter((n) => !n.read).length
  res.json({
    items: items.map((n) => ({
      ...n,
      actor: n.actor
        ? { id: n.actor.id, firstName: n.actor.firstName, lastName: n.actor.lastName, avatarUrl: n.actor.avatarUrl }
        : null,
    })),
    unread,
  })
})

notificationsRouter.post('/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId! },
    data: { read: true },
  })
  res.json({ ok: true })
})

notificationsRouter.post('/:id/read', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: param(req, 'id'), userId: req.userId! },
    data: { read: true },
  })
  res.json({ ok: true })
})
