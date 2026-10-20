import { Router } from 'express'
import { PostType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { zodMessage } from '../lib/validation.js'
import { getFollowStatus, setAccountPrivacy } from '../services/follows.js'
import { canViewProfileContent, PRIVATE_ACCOUNT_MESSAGE } from '../services/privacy.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const viewerId = req.userId!
  const isSelf = user.id === viewerId
  const canView = await canViewProfileContent(viewerId, user)
  // Private accounts still expose header, counts and bio; the grid stays empty for non-followers.
  const posts = canView
    ? await prisma.post.findMany({
        where: { authorId: user.id, type: PostType.POST },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
    : []
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
  const followStatus = isSelf ? 'none' : await getFollowStatus(viewerId, user.id)
  res.json({
    user: { ...toPublicUser(user), displayName: user.displayName || `${user.firstName} ${user.lastName}` },
    isFollowing: followStatus === 'following',
    followStatus,
    canView,
    isSelf,
    stats: { posts: postCount, followers: followerCount, following: followingCount },
    grid,
  })
})

/** Followers / following lists, hidden for private accounts the viewer does not follow. */
for (const list of ['followers', 'following'] as const) {
  usersRouter.get(`/:username/${list}`, requireAuth, async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
    if (!user) return res.status(404).json({ message: 'Not found' })
    if (!(await canViewProfileContent(req.userId!, user))) {
      return res.status(403).json({ message: PRIVATE_ACCOUNT_MESSAGE })
    }
    const rows = await prisma.follow.findMany({
      where: list === 'followers' ? { followingId: user.id } : { followerId: user.id },
      include: { follower: true, following: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      users: rows.map((r) => toPublicUser(list === 'followers' ? r.follower : r.following)),
    })
  })
}

const updateMeSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  displayName: z.string().trim().max(60).optional(),
  bio: z.string().max(150).optional(),
  location: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const body = updateMeSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const { isPrivate, ...profile } = body.data
  // Privacy goes through the service so going public also approves pending requests.
  if (isPrivate !== undefined) await setAccountPrivacy(req.userId!, isPrivate)
  const user = await prisma.user.update({ where: { id: req.userId! }, data: profile })
  res.json(toPublicUser(user))
})
