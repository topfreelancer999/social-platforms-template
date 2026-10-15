import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { areFriends, getFriendIds } from '../services/friends.js'
import { param } from '../lib/params.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const friendIds = await getFriendIds(viewerId)
  const posts = await prisma.post.findMany({
    where: { authorId: user.id, groupId: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { author: true, reactions: true, _count: { select: { comments: true, shares: true } } },
  })
  res.json({
    user: toPublicUser(user),
    isFriend: friendIds.includes(user.id),
    isSelf: user.id === viewerId,
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      totalReactions: p.reactions.length,
      commentCount: p._count.comments,
    })),
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, location, workplace, avatarUrl, coverUrl } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, location, workplace, avatarUrl, coverUrl },
  })
  res.json(toPublicUser(user))
})
