import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const followsRouter = Router()
followsRouter.use(requireAuth)

followsRouter.get('/', async (req: AuthRequest, res) => {
  const rows = await prisma.userFollow.findMany({
    where: { followerId: req.userId! },
    include: { following: true },
  })
  res.json({ following: rows.map((r) => toPublicUser(r.following)) })
})

followsRouter.post('/:userId', async (req: AuthRequest, res) => {
  const followingId = param(req, 'userId')
  if (followingId === req.userId) return res.status(400).json({ message: 'Cannot follow yourself' })
  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: req.userId!, followingId } },
    create: { followerId: req.userId!, followingId },
    update: {},
  })
  res.json({ following: true })
})

followsRouter.delete('/:userId', async (req: AuthRequest, res) => {
  await prisma.userFollow.deleteMany({
    where: { followerId: req.userId!, followingId: param(req, 'userId') },
  })
  res.json({ unfollowed: true })
})
