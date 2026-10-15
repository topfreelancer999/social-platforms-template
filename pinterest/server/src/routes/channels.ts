import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const channelsRouter = Router()
channelsRouter.use(requireAuth)

channelsRouter.get('/', async (_req, res) => {
  const channels = await prisma.channel.findMany({
    include: { _count: { select: { followers: true, posts: true } }, owner: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    channels: channels.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      followerCount: c._count.followers,
      postCount: c._count.posts,
      owner: toPublicUser(c.owner),
    })),
  })
})

channelsRouter.get('/:slug', async (req: AuthRequest, res) => {
  const channel = await prisma.channel.findUnique({
    where: { slug: param(req, 'slug') },
    include: {
      owner: true,
      posts: { orderBy: { createdAt: 'desc' }, take: 30 },
      _count: { select: { followers: true } },
    },
  })
  if (!channel) return res.status(404).json({ message: 'Not found' })
  const following = await prisma.channelFollow.findUnique({
    where: { channelId_userId: { channelId: channel.id, userId: req.userId! } },
  })
  res.json({
    channel: {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      description: channel.description,
      imageUrl: channel.imageUrl,
      followerCount: channel._count.followers,
      owner: toPublicUser(channel.owner),
      isFollowing: !!following,
    },
    posts: channel.posts,
  })
})

channelsRouter.post('/:slug/follow', async (req: AuthRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { slug: param(req, 'slug') } })
  if (!channel) return res.status(404).json({ message: 'Not found' })
  await prisma.channelFollow.upsert({
    where: { channelId_userId: { channelId: channel.id, userId: req.userId! } },
    create: { channelId: channel.id, userId: req.userId! },
    update: {},
  })
  res.json({ following: true })
})

channelsRouter.post('/:slug/posts', async (req: AuthRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { slug: param(req, 'slug') } })
  if (!channel) return res.status(404).json({ message: 'Not found' })
  if (channel.ownerId !== req.userId) return res.status(403).json({ message: 'Owner only' })
  const { title, caption, imageUrl, linkUrl } = req.body as { title: string; caption?: string; imageUrl: string; linkUrl?: string }
  const post = await prisma.channelPost.create({
    data: { channelId: channel.id, title, caption: caption?.trim() ?? '', imageUrl, linkUrl: linkUrl ?? null },
  })
  res.status(201).json({ post })
})
