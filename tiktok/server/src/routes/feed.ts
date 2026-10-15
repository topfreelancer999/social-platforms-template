import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds, isBlocked } from '../services/follows.js'
import { enrichVideo } from '../services/videos.js'

export const feedRouter = Router()
feedRouter.use(requireAuth)

const PAGE_SIZE = 10

feedRouter.get('/for-you', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const videos = await prisma.video.findMany({
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })
  const items = []
  for (const v of videos) {
    if (await isBlocked(userId, v.authorId)) continue
    const e = await enrichVideo(v.id, userId)
    if (e) items.push(e)
  }
  res.json({ items, page, hasMore: videos.length === PAGE_SIZE })
})

feedRouter.get('/following', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const followingIds = await getFollowingIds(userId)
  const videos = await prisma.video.findMany({
    where: { authorId: { in: [...followingIds, userId] } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, userId)
    if (e) items.push(e)
  }
  res.json({ items, page, hasMore: videos.length === PAGE_SIZE })
})

feedRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const followingIds = await getFollowingIds(userId)
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      author: true,
      comments: { include: { author: true }, take: 5 },
      reactions: true,
      _count: { select: { shares: true, comments: true } },
    },
  })
  const items = []
  for (const p of posts) {
    if (await isBlocked(userId, p.authorId)) continue
    const summary: Record<string, number> = {}
    for (const r of p.reactions) summary[r.type] = (summary[r.type] ?? 0) + 1
    const myReaction = p.reactions.find((r) => r.userId === userId)
    items.push({
      ...p,
      author: { id: p.author.id, username: p.author.username, firstName: p.author.firstName, lastName: p.author.lastName, avatarUrl: p.author.avatarUrl },
      reactionSummary: summary,
      totalReactions: p.reactions.length,
      shareCount: p._count.shares,
      commentCount: p._count.comments,
      myReaction: myReaction?.type ?? null,
    })
  }
  res.json({ items, page, hasMore: posts.length === PAGE_SIZE })
})
