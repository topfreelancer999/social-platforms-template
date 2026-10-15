import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getSubscribedChannelIds } from '../services/subscriptions.js'
import { enrichVideo } from '../services/videos.js'
import { toPublicUser } from '../lib/user.js'

export const feedRouter = Router()

feedRouter.get('/trending', async (_req, res) => {
  const videos = await prisma.video.findMany({
    where: { published: true },
    orderBy: { viewCount: 'desc' },
    take: 12,
    include: { author: true },
  })
  res.json(
    videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      createdAt: v.createdAt,
      channel: { username: v.author.username, channelName: v.author.channelName, avatarUrl: v.author.avatarUrl },
    })),
  )
})

feedRouter.use(requireAuth)

feedRouter.get('/home', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const videos = await prisma.video.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 12,
    take: 12,
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, userId)
    if (e) items.push(e)
  }
  res.json({ items, hasMore: videos.length === 12 })
})

feedRouter.get('/subscriptions', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const channelIds = await getSubscribedChannelIds(userId)
  const videos = await prisma.video.findMany({
    where: { authorId: { in: channelIds }, published: true },
    orderBy: { createdAt: 'desc' },
    take: 24,
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, userId)
    if (e) items.push(e)
  }
  res.json({ items })
})

feedRouter.get('/channel', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const channelIds = await getSubscribedChannelIds(userId)
  const posts = await prisma.post.findMany({
    where: { authorId: { in: [...channelIds, userId] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: true, reactions: true, _count: { select: { comments: true } } },
  })
  res.json({
    items: posts.map((p) => ({
      ...p,
      author: toPublicUser(p.author),
      totalReactions: p.reactions.length,
      commentCount: p._count.comments,
    })),
  })
})
