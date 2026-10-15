import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFriendIds, isBlocked } from '../services/friends.js'

export const feedRouter = Router()
feedRouter.use(requireAuth)

const PAGE_SIZE = 10

feedRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const page = Math.max(1, Number(req.query.page ?? 1))
  const filter = String(req.query.filter ?? 'all')
  const friendIds = await getFriendIds(userId)
  const groupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((g) => g.groupId)

  const where: import('@prisma/client').Prisma.PostWhereInput = {}
  if (filter === 'friends') {
    where.authorId = { in: [...friendIds, userId] }
    where.groupId = null
  } else if (filter === 'groups') {
    where.groupId = { in: groupIds }
  }

  const total = await prisma.post.count({ where })
  const posts = await prisma.post.findMany({
    where,
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
      author: { ...p.author, passwordHash: undefined },
      comments: p.comments.map((c) => ({
        ...c,
        author: { ...c.author, passwordHash: undefined },
      })),
      reactionSummary: summary,
      totalReactions: p.reactions.length,
      shareCount: p._count.shares,
      commentCount: p._count.comments,
      myReaction: myReaction?.type ?? null,
    })
  }
  res.json({ items, page, total, hasMore: page * PAGE_SIZE < total })
})
