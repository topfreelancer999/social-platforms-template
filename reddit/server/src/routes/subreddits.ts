import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const subredditsRouter = Router()
subredditsRouter.use(requireAuth)

subredditsRouter.get('/', async (_req, res) => {
  const subs = await prisma.subreddit.findMany({
    include: { _count: { select: { members: true, posts: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({
    subreddits: subs.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      iconUrl: s.iconUrl,
      memberCount: s._count.members,
      postCount: s._count.posts,
    })),
  })
})

subredditsRouter.get('/:slug', async (req: AuthRequest, res) => {
  const sub = await prisma.subreddit.findUnique({
    where: { slug: param(req, 'slug') },
    include: { _count: { select: { members: true } } },
  })
  if (!sub) return res.status(404).json({ message: 'Not found' })
  const member = await prisma.subredditMember.findUnique({
    where: { subredditId_userId: { subredditId: sub.id, userId: req.userId! } },
  })
  res.json({
    subreddit: {
      ...sub,
      memberCount: sub._count.members,
      isMember: !!member,
    },
  })
})

subredditsRouter.post('/', async (req: AuthRequest, res) => {
  const { name, description } = req.body as { name: string; description?: string }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `r-${Date.now()}`
  const sub = await prisma.subreddit.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() ?? '',
      iconUrl: `https://picsum.photos/seed/${slug}/128/128`,
      bannerUrl: `https://picsum.photos/seed/${slug}b/800/200`,
      creatorId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
  })
  res.status(201).json({ subreddit: sub })
})

subredditsRouter.post('/:slug/join', async (req: AuthRequest, res) => {
  const sub = await prisma.subreddit.findUnique({ where: { slug: param(req, 'slug') } })
  if (!sub) return res.status(404).json({ message: 'Not found' })
  await prisma.subredditMember.upsert({
    where: { subredditId_userId: { subredditId: sub.id, userId: req.userId! } },
    create: { subredditId: sub.id, userId: req.userId! },
    update: {},
  })
  res.json({ joined: true })
})

subredditsRouter.post('/:slug/leave', async (req: AuthRequest, res) => {
  const sub = await prisma.subreddit.findUnique({ where: { slug: param(req, 'slug') } })
  if (!sub) return res.status(404).json({ message: 'Not found' })
  await prisma.subredditMember.deleteMany({
    where: { subredditId: sub.id, userId: req.userId! },
  })
  res.json({ joined: false })
})
