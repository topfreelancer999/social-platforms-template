import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'
import { isSubscribed } from '../services/subscriptions.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const videos = await prisma.video.findMany({
    where: { authorId: user.id, published: true },
    orderBy: { createdAt: 'desc' },
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, viewerId)
    if (e) items.push(e)
  }
  const subscriberCount = await prisma.subscription.count({ where: { channelId: user.id } })
  res.json({
    user: { ...toPublicUser(user), channelName: user.channelName || `${user.firstName} ${user.lastName}` },
    isSubscribed: await isSubscribed(viewerId, user.id),
    isSelf: user.id === viewerId,
    subscriberCount,
    videos: items,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl, channelName } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl, channelName },
  })
  res.json(toPublicUser(user))
})
