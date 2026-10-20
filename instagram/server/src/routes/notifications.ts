import { Router } from 'express'
import { NotificationType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { pendingRequestCount } from '../services/follows.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  // Like Instagram, individual requests are folded into the "Follow requests (N)" row.
  const items = await prisma.notification.findMany({
    where: { userId, type: { not: NotificationType.FOLLOW_REQUEST } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: true },
  })
  const [unread, unreadRequests, requests] = await Promise.all([
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.count({ where: { userId, read: false, type: NotificationType.FOLLOW_REQUEST } }),
    prisma.followRequest.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { requester: { select: { username: true, avatarUrl: true } } },
    }),
  ])
  res.json({
    items: items.map((n) => ({
      ...n,
      actor: n.actor
        ? {
            id: n.actor.id,
            username: n.actor.username,
            firstName: n.actor.firstName,
            lastName: n.actor.lastName,
            avatarUrl: n.actor.avatarUrl,
          }
        : null,
    })),
    unread,
    followRequests: {
      count: await pendingRequestCount(userId),
      unread: unreadRequests,
      preview: requests.map((r) => r.requester),
    },
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
