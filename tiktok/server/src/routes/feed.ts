import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds, isBlocked } from '../services/follows.js'
import { getFollowingFeed, getForYouFeed, InvalidCursorError } from '../services/feed.js'

export const feedRouter = Router()
feedRouter.use(requireAuth)

const PAGE_SIZE = 10

const videoFeedQuery = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  seed: z
    .string()
    .regex(/^[a-z0-9]{1,16}$/i, 'seed must be 1-16 alphanumeric characters')
    .optional(),
})

function handleFeedError(err: unknown, res: Response) {
  if (err instanceof InvalidCursorError) return res.status(400).json({ message: err.message })
  throw err
}

/** Ranked mix of recent + engaging videos from everyone except the viewer and blocked users. */
feedRouter.get('/for-you', async (req: AuthRequest, res) => {
  const query = videoFeedQuery.safeParse(req.query)
  if (!query.success) return res.status(400).json({ message: query.error.issues[0]?.message ?? 'Invalid query' })
  try {
    res.json(await getForYouFeed(req.userId!, query.data))
  } catch (err) {
    handleFeedError(err, res)
  }
})

/** Newest-first videos from creators the viewer follows (keyset cursor pagination). */
feedRouter.get('/following', async (req: AuthRequest, res) => {
  const query = videoFeedQuery.safeParse(req.query)
  if (!query.success) return res.status(400).json({ message: query.error.issues[0]?.message ?? 'Invalid query' })
  try {
    res.json(await getFollowingFeed(req.userId!, query.data))
  } catch (err) {
    handleFeedError(err, res)
  }
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
