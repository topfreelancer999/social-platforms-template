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
  const now = new Date()
  const storyCount = await prisma.snap.count({
    where: { authorId: user.id, expiresAt: { gt: now } },
  })
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      snapScore: user.snapScore,
      bitmojiUrl: user.bitmojiUrl || user.avatarUrl,
      bio: user.bio,
    },
    isSelf: user.id === req.userId,
    storyCount,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, bitmojiUrl, displayName } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, bitmojiUrl, displayName },
  })
  res.json(toPublicUser(user))
})
