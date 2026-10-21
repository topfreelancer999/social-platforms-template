import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { findPosts } from '../services/posts.js'

export const usersRouter = Router()

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const posts = await findPosts(req.userId!, { where: { authorId: user.id }, take: 20 })
  const subs = await prisma.subredditMember.findMany({
    where: { userId: user.id },
    include: { subreddit: true },
    take: 10,
  })
  res.json({
    user: { ...toPublicUser(user), displayName: user.displayName || `${user.firstName} ${user.lastName}` },
    isSelf: user.id === req.userId,
    posts,
    subreddits: subs.map((m) => m.subreddit),
  })
})

/** The user's comments, newest first, with the post they belong to. */
usersRouter.get('/:username/comments', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  const comments = await prisma.comment.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      votes: { where: { userId: req.userId! }, select: { value: true } },
      post: { select: { id: true, title: true, subreddit: { select: { slug: true, name: true } } } },
    },
  })
  res.json({
    comments: comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      parentId: c.parentId,
      createdAt: c.createdAt,
      score: c.score,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      myVote: c.votes[0]?.value ?? 0,
      post: c.post,
    })),
  })
})

/** Posts the user upvoted or downvoted. Private, like Reddit's default. */
usersRouter.get('/:username/:direction', requireAuth, async (req: AuthRequest, res) => {
  const direction = param(req, 'direction')
  if (direction !== 'upvoted' && direction !== 'downvoted') return res.status(404).json({ message: 'Not found' })
  const user = await prisma.user.findUnique({ where: { username: param(req, 'username') } })
  if (!user) return res.status(404).json({ message: 'Not found' })
  if (user.id !== req.userId) return res.status(403).json({ message: 'Only you can see your votes' })
  const value = direction === 'upvoted' ? 1 : -1
  const votes = await prisma.postVote.findMany({
    where: { userId: user.id, value },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: { postId: true },
  })
  const posts = await findPosts(req.userId!, { where: { id: { in: votes.map((v) => v.postId) } }, take: 30 })
  const order = new Map(votes.map((v, i) => [v.postId, i]))
  res.json({ posts: posts.sort((a, b) => order.get(a.id)! - order.get(b.id)!) })
})

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { firstName, lastName, bio, avatarUrl, coverUrl, displayName } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { firstName, lastName, bio, avatarUrl, coverUrl, displayName },
  })
  res.json(toPublicUser(user))
})
