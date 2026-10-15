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
  const img = imageUrl ?? `https://picsum.photos/seed/g${Date.now()}/200/200`
  const thread = await prisma.thread.create({
    data: {
      isGroup: true,
      name,
      avatarUrl: img,
      participants: { create: [{ userId: req.userId! }] },
    },
  })
  const group = await prisma.group.create({
    data: {
      name,
      description,
      privacy: privacy ?? GroupPrivacy.PUBLIC,
      imageUrl: img,
      creatorId: req.userId!,
      threadId: thread.id,
      members: { create: { userId: req.userId!, isAdmin: true } },
    },
  })
  res.status(201).json({ ...group, threadId: thread.id })
})

groupsRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const group = await prisma.group.findUnique({
    where: { id: param(req, 'id') },
    include: { members: { include: { user: true } } },
  })
  if (!group) return res.status(404).json({ message: 'Not found' })
  res.json({
    group,
    members: group.members.map((m) => toPublicUser(m.user)),
    isMember: group.members.some((m) => m.userId === req.userId),
    threadId: group.threadId,
  })
})

groupsRouter.post('/:id/join', requireAuth, async (req: AuthRequest, res) => {
  const groupId = param(req, 'id')
  const userId = req.userId!
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return res.status(404).json({ message: 'Not found' })
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId },
    update: {},
  })
  if (group.threadId) {
    await prisma.threadParticipant.upsert({
      where: { threadId_userId: { threadId: group.threadId, userId } },
      create: { threadId: group.threadId, userId },
      update: {},
    })
  }
  res.json({ ok: true, threadId: group.threadId })
})

groupsRouter.post('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  const groupId = param(req, 'id')
  const userId = req.userId!
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  await prisma.groupMember.deleteMany({ where: { groupId, userId } })
  if (group?.threadId) {
    await prisma.threadParticipant.deleteMany({ where: { threadId: group.threadId, userId } })
  }
  res.json({ ok: true })
})
