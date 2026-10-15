import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: true, _count: { select: { comments: true, reactions: true } } },
  })
  const servers = await prisma.serverMember.findMany({
    where: { userId: user.id },
    include: { server: true },
    take: 10,
  })
  res.json({
    user: { ...toPublicUser(user), displayName: user.displayName || `${user.firstName} ${user.lastName}` },
    isSelf: user.id === viewerId,
    posts,
    servers: servers.map((m) => m.server),
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl, displayName, status } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl, displayName, status },
  })
  res.json(toPublicUser(user))
})
