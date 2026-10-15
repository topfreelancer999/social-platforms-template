import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds } from '../services/follows.js'
import { buildTimeline } from '../services/tweets.js'

export const feedRouter = Router()
feedRouter.use(requireAuth)

const PAGE_SIZE = 15

feedRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.min(500, Math.max(1, Number(req.query.page ?? 1) || 1))
  const tab = String(req.query.tab ?? 'for-you')
  const followingIds = await getFollowingIds(userId)
  const communityIds = (
    await prisma.communityMember.findMany({ where: { userId }, select: { communityId: true } })
  ).map((c) => c.communityId)

  // Quote posts are regular posts and belong in the timeline; replies do not.
  const where: import('@prisma/client').Prisma.TweetWhereInput = { replyToId: null }

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

  const timeline = await buildTimeline({
    viewerId: userId,
    tweetWhere: where,
    repostUserIds: [...followingIds, userId],
    page,
    pageSize: PAGE_SIZE,
  })
  res.json(timeline)
})
