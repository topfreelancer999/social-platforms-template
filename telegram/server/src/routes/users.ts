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
  const contact = await prisma.contact.findUnique({
    where: { userId_contactUserId: { userId: req.userId!, contactUserId: user.id } },
  })
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      bio: user.bio,
      phone: user.phone,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    },
    isSelf: user.id === req.userId,
    isContact: !!contact,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, displayName, phone, isOnline } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      firstName,
      lastName,
      bio,
      avatarUrl,
      displayName,
      phone,
      isOnline,
      lastSeen: new Date(),
    },
  })
  res.json(toPublicUser(user))
})
