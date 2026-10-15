import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichPost } from '../services/posts.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const enriched = []
  for (const p of posts) {
    const e = await enrichPost(p.id, req.userId!)
    if (e) enriched.push(e)
  }
  const subs = await prisma.subredditMember.findMany({
    where: { userId: user.id },
    include: { subreddit: true },
    take: 10,
  })
  res.json({
    user: { ...toPublicUser(user), displayName: user.displayName || `${user.firstName} ${user.lastName}`, karma: user.karma },
    isSelf: user.id === req.userId,
    posts: enriched,
    subreddits: subs.map((m) => m.subreddit),
  })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl, displayName } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl, displayName },
  })
  res.json(toPublicUser(user))
})
