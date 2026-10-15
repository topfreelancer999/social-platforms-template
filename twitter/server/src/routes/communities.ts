import { Router } from 'express'
import { CommunityPrivacy } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichTweet } from '../services/tweets.js'

export const communitiesRouter = Router()
communitiesRouter.use(requireAuth)

communitiesRouter.get('/', async (_req, res) => {
  const communities = await prisma.community.findMany({
    include: { _count: { select: { members: true } } },
  })
  res.json(communities.map((c) => ({ ...c, memberCount: c._count.members })))
})

communitiesRouter.post('/', async (req: AuthRequest, res) => {
  const { name, description, privacy, imageUrl } = req.body as {
    name: string
    description: string
    privacy?: CommunityPrivacy
    imageUrl?: string
  }
  const community = await prisma.community.create({
    data: {
      name,
      description,
      privacy: privacy ?? CommunityPrivacy.PUBLIC,
      imageUrl: imageUrl ?? `https://picsum.photos/seed/c${Date.now()}/200/200`,
      creatorId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
  })
  res.status(201).json(community)
})

communitiesRouter.get('/:id', async (req: AuthRequest, res) => {
  const community = await prisma.community.findUnique({
    where: { id: param(req, 'id') },
    include: {
      members: { include: { user: true } },
      tweets: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!community) return res.status(404).json({ message: 'Not found' })
  const posts = []
  for (const t of community.tweets) {
    const e = await enrichTweet(t.id, req.userId!)
    if (e) posts.push(e)
  }
  res.json({
    community,
    members: community.members.map((m) => toPublicUser(m.user)),
    tweets: posts,
    isMember: community.members.some((m) => m.userId === req.userId),
  })
})

communitiesRouter.post('/:id/join', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId: id, userId: req.userId! } },
    create: { communityId: id, userId: req.userId! },
    update: {},
  })
  res.json({ ok: true })
})

communitiesRouter.post('/:id/leave', async (req: AuthRequest, res) => {
  await prisma.communityMember.deleteMany({
    where: { communityId: param(req, 'id'), userId: req.userId! },
  })
  res.json({ ok: true })
})
