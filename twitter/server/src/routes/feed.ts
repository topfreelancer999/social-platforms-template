import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds, isBlocked } from '../services/follows.js'
import { enrichTweet } from '../services/tweets.js'

export const feedRouter = Router()
feedRouter.use(requireAuth)

const PAGE_SIZE = 15

feedRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const tab = String(req.query.tab ?? 'for-you')
  const followingIds = await getFollowingIds(userId)
  const communityIds = (
    await prisma.communityMember.findMany({ where: { userId }, select: { communityId: true } })
  ).map((c) => c.communityId)

  const where: import('@prisma/client').Prisma.TweetWhereInput = {
    replyToId: null,
    quoteTweetId: null,
  }

  if (tab === 'following') {
    where.authorId = { in: [...followingIds, userId] }
    where.communityId = null
  } else {
    where.OR = [
      { authorId: { in: [...followingIds, userId] } },
      { communityId: { in: communityIds } },
      { author: { verified: true } },
    ]
  }

  const total = await prisma.tweet.count({ where })
  const tweets = await prisma.tweet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const items = []
  for (const t of tweets) {
    if (await isBlocked(userId, t.authorId)) continue
    const enriched = await enrichTweet(t.id, userId)
    if (enriched) items.push(enriched)
  }
  res.json({ items, page, total, hasMore: page * PAGE_SIZE < total })
})
