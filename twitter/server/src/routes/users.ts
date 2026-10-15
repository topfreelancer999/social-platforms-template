import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds, isFollowing } from '../services/follows.js'
import { param } from '../lib/params.js'
import { buildTimeline } from '../services/tweets.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  // Posts and reposts by this user, newest first ("<Name> reposted" entries).
  const { items } = await buildTimeline({
    viewerId,
    tweetWhere: { authorId: user.id, replyToId: null },
    repostUserIds: [user.id],
    page: 1,
    pageSize: 20,
  })
  const followerCount = await prisma.follow.count({ where: { followingId: user.id } })
  const followingCount = await prisma.follow.count({ where: { followerId: user.id } })
  res.json({
    user: toPublicUser(user),
    isFollowing: await isFollowing(viewerId, user.id),
    isSelf: user.id === viewerId,
    followerCount,
    followingCount,
    tweets: items,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, location, workplace, avatarUrl, coverUrl } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, location, workplace, avatarUrl, coverUrl },
  })
  res.json(toPublicUser(user))
})
