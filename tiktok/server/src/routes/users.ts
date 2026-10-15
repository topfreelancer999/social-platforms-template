import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
  })
  const videos = await prisma.video.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, viewerId)
    if (e) items.push(e)
  }
  const followerCount = await prisma.follow.count({ where: { followingId: user.id } })
  const followingCount = await prisma.follow.count({ where: { followerId: user.id } })
  res.json({
    user: toPublicUser(user),
    isFollowing: !!follow,
    isSelf: user.id === viewerId,
    followerCount,
    followingCount,
    videos: items,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl },
  })
  res.json(toPublicUser(user))
})
