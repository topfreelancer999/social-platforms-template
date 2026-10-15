import { Router } from 'express'
import { FriendshipStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const friendsRouter = Router()
friendsRouter.use(requireAuth)

friendsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const rows = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: { sender: true, receiver: true },
  })
  res.json({
    friends: rows.map((f) => {
      const u = f.senderId === userId ? f.receiver : f.sender
      return { ...toPublicUser(u), friendshipId: f.id }
    }),
  })
})

friendsRouter.get('/requests', async (req: AuthRequest, res) => {
  const pending = await prisma.friendship.findMany({
    where: { receiverId: req.userId!, status: FriendshipStatus.PENDING },
    include: { sender: true },
  })
  res.json({ requests: pending.map((p) => toPublicUser(p.sender)) })
})

friendsRouter.post('/:userId', async (req: AuthRequest, res) => {
  const receiverId = param(req, 'userId')
  if (receiverId === req.userId) return res.status(400).json({ message: 'Cannot add yourself' })
  await prisma.friendship.upsert({
    where: { senderId_receiverId: { senderId: req.userId!, receiverId } },
    create: { senderId: req.userId!, receiverId, status: FriendshipStatus.PENDING },
    update: {},
  })
  res.json({ sent: true })
})

friendsRouter.post('/:userId/accept', async (req: AuthRequest, res) => {
  await prisma.friendship.updateMany({
    where: { senderId: param(req, 'userId'), receiverId: req.userId! },
    data: { status: FriendshipStatus.ACCEPTED },
  })
  res.json({ accepted: true })
})
