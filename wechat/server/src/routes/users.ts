import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { areFriends } from '../services/moments.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const isSelf = user.id === viewerId
  const isFriend = !isSelf && (await areFriends(viewerId, user.id))
  const [friendship, tags] = isFriend
    ? await Promise.all([
        prisma.friendship.findUnique({ where: { userId_friendId: { userId: viewerId, friendId: user.id } } }),
        prisma.contactTag.findMany({
          where: { ownerId: viewerId, members: { some: { userId: user.id } } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ])
    : [null, []]
  res.json({
    user: {
      ...toPublicUser(user),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      about: user.about,
      phone: user.phone,
      wechatId: user.wechatId,
      lastSeen: user.lastSeen,
    },
    isSelf,
    isFriend,
    momentsPrivacy: friendship
      ? { blockMyMoments: friendship.blockMyMoments, hideTheirMoments: friendship.hideTheirMoments }
      : null,
    tags,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, about, avatarUrl, coverUrl, displayName, phone, wechatId } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, about, avatarUrl, coverUrl, displayName, phone, wechatId, lastSeen: new Date() },
  })
  res.json(toPublicUser(user))
})
