import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { getFollowingIds } from '../services/follows.js'

export const followsRouter = Router()
followsRouter.use(requireAuth)

followsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const followingIds = await getFollowingIds(userId)
  const following = await prisma.user.findMany({ where: { id: { in: followingIds } } })
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    include: { follower: true },
  })
  const allUsers = await prisma.user.findMany({ where: { id: { not: userId } }, take: 50 })
  const connected = new Set([...followingIds, userId])
  const suggestions = allUsers.filter((u) => !connected.has(u.id)).slice(0, 8).map(toPublicUser)
  res.json({
    following: following.map(toPublicUser),
    followers: followers.map((f) => toPublicUser(f.follower)),
    suggestions,
  })
})

followsRouter.post('/:id', async (req: AuthRequest, res) => {
  const followerId = req.userId!
  const followingId = param(req, 'id')
  if (followingId === followerId) return res.status(400).json({ message: 'You cannot follow yourself' })
  const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } })
  if (!target) return res.status(404).json({ message: 'User not found' })
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  })
  res.json({ ok: true })
})

followsRouter.delete('/:id', async (req: AuthRequest, res) => {
  await prisma.follow.deleteMany({
    where: { followerId: req.userId!, followingId: param(req, 'id') },
  })
  res.json({ ok: true })
})
