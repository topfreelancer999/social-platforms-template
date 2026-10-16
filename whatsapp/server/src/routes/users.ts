import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { presenceView } from '../lib/presence.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const found = await prisma.user.findUnique({
    where: { username: param(req, 'username') },
    include: { settings: true },
  })
  if (!found) return res.status(404).json({ message: 'Not found' })
  const { settings, ...user } = found
  const isSelf = user.id === req.userId
  const viewer = isSelf ? null : await prisma.userSettings.findUnique({ where: { userId: req.userId! } })
  const presence = isSelf
    ? { online: true, lastSeen: user.lastSeen }
    : presenceView({ ...user, settings }, viewer?.lastSeenVisible ?? true)
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      about: user.about,
      phone: user.phone,
      ...presence,
    },
    isSelf,
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
