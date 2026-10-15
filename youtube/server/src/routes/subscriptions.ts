import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { getSubscribedChannelIds } from '../services/subscriptions.js'

export const subscriptionsRouter = Router()
subscriptionsRouter.use(requireAuth)

subscriptionsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const channelIds = await getSubscribedChannelIds(userId)
  const channels = await prisma.user.findMany({ where: { id: { in: channelIds } } })
  const allUsers = await prisma.user.findMany({ where: { id: { not: userId } }, take: 50 })
  const connected = new Set([...channelIds, userId])
  const suggestions = allUsers.filter((u) => !connected.has(u.id)).slice(0, 8).map(toPublicUser)
  res.json({
    subscriptions: channels.map((c) => ({
      ...toPublicUser(c),
      channelName: c.channelName || `${c.firstName} ${c.lastName}`,
    })),
    suggestions,
  })
})

subscriptionsRouter.post('/:channelId', async (req: AuthRequest, res) => {
  const subscriberId = req.userId!
  const channelId = param(req, 'channelId')
  await prisma.subscription.upsert({
    where: { subscriberId_channelId: { subscriberId, channelId } },
    create: { subscriberId, channelId },
    update: {},
  })
  await prisma.notification.create({
    data: {
      userId: channelId,
      actorId: subscriberId,
      type: 'SUBSCRIBE',
      title: 'New subscriber',
      body: 'Someone subscribed to your channel',
      link: `/channel/${channelId}`,
    },
  }).catch(() => {})
  res.json({ ok: true })
})

subscriptionsRouter.delete('/:channelId', async (req: AuthRequest, res) => {
  await prisma.subscription.deleteMany({
    where: { subscriberId: req.userId!, channelId: param(req, 'channelId') },
  })
  res.json({ ok: true })
})
