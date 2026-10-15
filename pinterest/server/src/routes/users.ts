import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { enrichPin } from '../services/pins.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const [pinCount, boardCount, followerCount, followingCount, following, boards, pins] = await Promise.all([
    prisma.pin.count({ where: { authorId: user.id } }),
    prisma.board.count({ where: { userId: user.id, isSecret: false } }),
    prisma.userFollow.count({ where: { followingId: user.id } }),
    prisma.userFollow.count({ where: { followerId: user.id } }),
    prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: req.userId!, followingId: user.id } },
    }),
    prisma.board.findMany({
      where: { userId: user.id, isSecret: user.id === req.userId ? undefined : false },
      include: { _count: { select: { pins: true } } },
      take: 12,
    }),
    prisma.pin.findMany({
      where: { authorId: user.id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
  ])
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      bio: user.bio,
      website: user.website,
    },
    stats: { pinCount, boardCount, followerCount, followingCount },
    isSelf: user.id === req.userId,
    isFollowing: !!following,
    boards: boards.map((b) => ({ id: b.id, name: b.name, coverUrl: b.coverUrl, pinCount: b._count.pins })),
    pins: await Promise.all(pins.map((p) => enrichPin(p, req.userId!))),
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, displayName, website } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, displayName, website },
  })
  res.json(toPublicUser(user))
})
