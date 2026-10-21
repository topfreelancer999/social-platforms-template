import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { streakBetween } from '../lib/streaks.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const now = new Date()
  const storyCount = await prisma.snap.count({
    where: { authorId: user.id, expiresAt: { gt: now } },
  })
  const me = req.userId!
  const link =
    user.id === me
      ? null
      : await prisma.friendship.findFirst({
          where: {
            OR: [
              { senderId: me, receiverId: user.id },
              { senderId: user.id, receiverId: me },
            ],
          },
        })
  // Friendship profile: only friends see the streak and snap counts.
  let friendship = null
  if (link?.status === 'ACCEPTED') {
    const [streak, snapsSent, snapsReceived] = await Promise.all([
      streakBetween(prisma, me, user.id, now),
      prisma.directSnap.count({ where: { senderId: me, recipientId: user.id } }),
      prisma.directSnap.count({ where: { senderId: user.id, recipientId: me } }),
    ])
    friendship = { status: 'FRIENDS' as const, since: link.createdAt, streak, snapsSent, snapsReceived }
  } else if (link) {
    friendship = { status: link.senderId === me ? ('REQUESTED' as const) : ('INCOMING' as const) }
  }
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
    friendship,
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
