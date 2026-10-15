import { Router } from 'express'
import { GroupPrivacy } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const groupsRouter = Router()

groupsRouter.get('/', requireAuth, async (_req, res) => {
  const groups = await prisma.group.findMany({
    include: { _count: { select: { members: true } } },
  })
  res.json(groups.map((g) => ({ ...g, memberCount: g._count.members })))
})

groupsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { name, description, privacy, imageUrl } = req.body as {
    name: string
    description: string
    privacy?: GroupPrivacy
    imageUrl?: string
  }
  const group = await prisma.group.create({
    data: {
      name,
      description,
      privacy: privacy ?? GroupPrivacy.PUBLIC,
      imageUrl: imageUrl ?? `https://picsum.photos/seed/g${Date.now()}/200/200`,
      creatorId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
  })
  res.status(201).json(group)
})

groupsRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const group = await prisma.group.findUnique({
    where: { id: param(req, 'id') },
    include: {
      members: { include: { user: true } },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: true, reactions: true, _count: { select: { comments: true } } },
      },
    },
  })
  if (!group) return res.status(404).json({ message: 'Not found' })
  res.json({
    group,
    members: group.members.map((m) => toPublicUser(m.user)),
    posts: group.posts.map((p) => ({
      ...p,
      author: toPublicUser(p.author),
      totalReactions: p.reactions.length,
      commentCount: p._count.comments,
    })),
    isMember: group.members.some((m) => m.userId === req.userId),
  })
})

groupsRouter.post('/:id/join', requireAuth, async (req: AuthRequest, res) => {
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: param(req, 'id'), userId: req.userId! } },
    create: { groupId: param(req, 'id'), userId: req.userId! },
    update: {},
  })
  res.json({ ok: true })
})

groupsRouter.post('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  await prisma.groupMember.deleteMany({
    where: { groupId: param(req, 'id'), userId: req.userId! },
  })
  res.json({ ok: true })
})
