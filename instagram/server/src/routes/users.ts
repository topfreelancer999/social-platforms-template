import { Router } from 'express'
import { PostType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { isFollowing } from '../services/follows.js'
import { enrichPost } from '../services/posts.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const posts = await prisma.post.findMany({
    where: { authorId: user.id, type: PostType.POST },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const postCount = await prisma.post.count({ where: { authorId: user.id } })
  const followerCount = await prisma.follow.count({ where: { followingId: user.id } })
  const followingCount = await prisma.follow.count({ where: { followerId: user.id } })
  const grid = posts.filter((p) => p.imageUrl).map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl,
    caption: p.caption,
    likeCount: 0,
  }))
  for (const g of grid) {
    g.likeCount = await prisma.postLike.count({ where: { postId: g.id } })
  }
  res.json({
    user: { ...toPublicUser(user), displayName: user.displayName || `${user.firstName} ${user.lastName}` },
    isFollowing: await isFollowing(viewerId, user.id),
    isSelf: user.id === viewerId,
    stats: { posts: postCount, followers: followerCount, following: followingCount },
    grid,
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl, displayName, isPrivate } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl, displayName, isPrivate },
  })
  res.json(toPublicUser(user))
})
