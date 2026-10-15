import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { getFollowingIds, isFollowing } from '../services/follows.js'
import { param } from '../lib/params.js'
import { enrichTweet } from '../services/tweets.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const tweets = await prisma.tweet.findMany({
    where: { authorId: user.id, replyToId: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const items = []
  for (const t of tweets) {
    const e = await enrichTweet(t.id, viewerId)
    if (e) items.push(e)
  }
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
