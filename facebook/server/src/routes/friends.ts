import { Router } from 'express'
import { FriendshipStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFriendIds } from '../services/friends.js'
import { param } from '../lib/params.js'

export const friendsRouter = Router()
friendsRouter.use(requireAuth)

friendsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const friendIds = await getFriendIds(userId)
  const friends = await prisma.user.findMany({ where: { id: { in: friendIds } } })
  const pending = await prisma.friendship.findMany({
    where: { receiverId: userId, status: FriendshipStatus.PENDING },
    include: { sender: true },
  })
  const sent = await prisma.friendship.findMany({
    where: { senderId: userId, status: FriendshipStatus.PENDING },
    include: { receiver: true },
  })
  const allUsers = await prisma.user.findMany({ where: { id: { not: userId } }, take: 50 })
  const connected = new Set([...friendIds, userId])
  const pendingIds = new Set([
    ...pending.map((p) => p.senderId),
    ...sent.map((s) => s.receiverId),
  ])
  const suggestions = allUsers
    .filter((u) => !connected.has(u.id) && !pendingIds.has(u.id))
    .slice(0, 8)
    .map(toPublicUser)
  res.json({
    friends: friends.map(toPublicUser),
    incoming: pending.map((p) => ({ ...p, from: toPublicUser(p.sender) })),
    outgoing: sent.map((s) => ({ ...s, to: toPublicUser(s.receiver) })),
    suggestions,
  })
})

friendsRouter.post('/:id/request', async (req: AuthRequest, res) => {
  const senderId = req.userId!
  const receiverId = param(req, 'id')
  await prisma.friendship.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId, status: FriendshipStatus.PENDING },
    update: {},
  })
  res.json({ status: 'pending_sent' })
})

friendsRouter.post('/requests/:id/accept', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  await prisma.friendship.update({
    where: { id, receiverId: req.userId! },
    data: { status: FriendshipStatus.ACCEPTED },
  })
  res.json({ ok: true })
})

friendsRouter.post('/requests/:id/decline', async (req: AuthRequest, res) => {
  await prisma.friendship.deleteMany({
    where: { id: param(req, 'id'), receiverId: req.userId! },
  })
  res.json({ ok: true })
})

friendsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const otherId = param(req, 'id')
  await prisma.friendship.deleteMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    },
  })
  res.json({ ok: true })
})

friendsRouter.post('/:id/block', async (req: AuthRequest, res) => {
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: param(req, 'id') } },
    create: { blockerId: req.userId!, blockedId: param(req, 'id') },
    update: {},
  })
  res.json({ ok: true })
})

friendsRouter.delete('/block/:id', async (req: AuthRequest, res) => {
  await prisma.block.deleteMany({
    where: { blockerId: req.userId!, blockedId: param(req, 'id') },
  })
  res.json({ ok: true })
})

friendsRouter.get('/blocked', async (req: AuthRequest, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId! },
    include: { blocked: true },
  })
  res.json(blocks.map((b) => toPublicUser(b.blocked)))
})
