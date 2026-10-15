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
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      about: user.about,
      phone: user.phone,
      lastSeen: user.lastSeen,
    },
    isSelf: user.id === req.userId,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, about, avatarUrl, coverUrl, displayName, phone } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, about, avatarUrl, coverUrl, displayName, phone, lastSeen: new Date() },
  })
  res.json(toPublicUser(user))
})
