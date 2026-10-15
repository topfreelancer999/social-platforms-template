import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { isFollowing } from '../services/follows.js'

export const followsRouter = Router()
followsRouter.use(requireAuth)

followsRouter.get('/following', async (req: AuthRequest, res) => {
  const rows = await prisma.follow.findMany({
    where: { followerId: req.userId! },
    include: { following: true },
  })
  res.json({ users: rows.map((r) => toPublicUser(r.following)) })
})

followsRouter.post('/:userId', async (req: AuthRequest, res) => {
  const followingId = param(req, 'userId')
  if (followingId === req.userId) return res.status(400).json({ message: 'Cannot follow yourself' })
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.userId!, followingId } },
    create: { followerId: req.userId!, followingId },
    update: {},
  })
  res.json({ following: true })
})

followsRouter.delete('/:userId', async (req: AuthRequest, res) => {
  await prisma.follow.deleteMany({
    where: { followerId: req.userId!, followingId: param(req, 'userId') },
  })
  res.json({ following: false })
})

followsRouter.get('/:userId/status', async (req: AuthRequest, res) => {
  const userId = param(req, 'userId')
  res.json({ following: await isFollowing(req.userId!, userId) })
})
