import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { areFriends, getFriendIds } from '../services/moments.js'

export const contactsRouter = Router()
contactsRouter.use(requireAuth)

const tagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(20, 'Tag name is too long'),
  memberIds: z.array(z.string().min(1)).max(500).default([]),
})
const tagPatchSchema = tagSchema.partial()
const momentsPrivacySchema = z
  .object({ blockMyMoments: z.boolean().optional(), hideTheirMoments: z.boolean().optional() })
  .refine((d) => d.blockMyMoments !== undefined || d.hideTheirMoments !== undefined, { message: 'Nothing to update' })
const addSchema = z.object({ userId: z.string().min(1) })

const tagInclude = {
  members: { include: { user: true } },
} satisfies Prisma.ContactTagInclude

function serializeTag(tag: Prisma.ContactTagGetPayload<{ include: typeof tagInclude }>) {
  const members = tag.members
    .map((m) => toPublicUser(m.user))
    .sort((a, b) => (a.displayName || a.firstName).localeCompare(b.displayName || b.firstName))
  return { id: tag.id, name: tag.name, memberCount: members.length, members }
}

async function validateMembers(ownerId: string, memberIds: string[]) {
  const friends = await getFriendIds(ownerId)
  return memberIds.every((id) => friends.has(id))
}

/** Friends (mutual contacts) with the viewer's per-contact Moments privacy flags and tags. */
contactsRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const friendIds = await getFriendIds(userId)
  const [rows, tags] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId, friendId: { in: [...friendIds] } },
      include: { friend: true },
    }),
    prisma.contactTag.findMany({ where: { ownerId: userId }, include: { members: true } }),
  ])
  const contacts = rows
    .map((r) => ({
      ...toPublicUser(r.friend),
      blockMyMoments: r.blockMyMoments,
      hideTheirMoments: r.hideTheirMoments,
      tags: tags.filter((t) => t.members.some((m) => m.userId === r.friendId)).map((t) => ({ id: t.id, name: t.name })),
    }))
    .sort((a, b) => (a.displayName || a.firstName).localeCompare(b.displayName || b.firstName))
  res.json({ contacts })
})

/** Add a contact (demo: accepted immediately, creating both sides of the friendship). */
contactsRouter.post('/', async (req: AuthRequest, res) => {
  const body = addSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: 'userId is required' })
  const userId = req.userId!
  const friendId = body.data.userId
  if (friendId === userId) return res.status(400).json({ message: 'You cannot add yourself' })
  const target = await prisma.user.findUnique({ where: { id: friendId } })
  if (!target) return res.status(404).json({ message: 'User not found' })
  await prisma.$transaction([
    prisma.friendship.upsert({
      where: { userId_friendId: { userId, friendId } },
      update: {},
      create: { userId, friendId },
    }),
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      update: {},
      create: { userId: friendId, friendId: userId },
    }),
  ])
  res.status(201).json({ ok: true })
})

/** Per-contact Moments privacy: "Don't let them see my Moments" / "Hide their Moments". */
contactsRouter.patch('/:userId/moments', async (req: AuthRequest, res) => {
  const body = momentsPrivacySchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const userId = req.userId!
  const friendId = param(req, 'userId')
  if (!(await areFriends(userId, friendId))) return res.status(404).json({ message: 'Contact not found' })
  const row = await prisma.friendship.update({
    where: { userId_friendId: { userId, friendId } },
    data: body.data,
  })
  res.json({ blockMyMoments: row.blockMyMoments, hideTheirMoments: row.hideTheirMoments })
})

contactsRouter.get('/tags', async (req: AuthRequest, res) => {
  const tags = await prisma.contactTag.findMany({
    where: { ownerId: req.userId! },
    include: tagInclude,
    orderBy: { name: 'asc' },
  })
  res.json({ tags: tags.map(serializeTag) })
})

contactsRouter.get('/tags/:id', async (req: AuthRequest, res) => {
  const tag = await prisma.contactTag.findUnique({ where: { id: param(req, 'id') }, include: tagInclude })
  if (!tag || tag.ownerId !== req.userId) return res.status(404).json({ message: 'Tag not found' })
  res.json(serializeTag(tag))
})

contactsRouter.post('/tags', async (req: AuthRequest, res) => {
  const body = tagSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const ownerId = req.userId!
  const memberIds = [...new Set(body.data.memberIds)]
  if (!(await validateMembers(ownerId, memberIds))) {
    return res.status(400).json({ message: 'Tags can only include your contacts' })
  }
  try {
    const tag = await prisma.contactTag.create({
      data: {
        ownerId,
        name: body.data.name,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: tagInclude,
    })
    res.status(201).json(serializeTag(tag))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ message: 'A tag with this name already exists' })
    }
    throw e
  }
})

contactsRouter.patch('/tags/:id', async (req: AuthRequest, res) => {
  const body = tagPatchSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const ownerId = req.userId!
  const tag = await prisma.contactTag.findUnique({ where: { id: param(req, 'id') } })
  if (!tag || tag.ownerId !== ownerId) return res.status(404).json({ message: 'Tag not found' })
  const memberIds = body.data.memberIds ? [...new Set(body.data.memberIds)] : undefined
  if (memberIds && !(await validateMembers(ownerId, memberIds))) {
    return res.status(400).json({ message: 'Tags can only include your contacts' })
  }
  try {
    const updated = await prisma.contactTag.update({
      where: { id: tag.id },
      data: {
        name: body.data.name,
        members: memberIds
          ? { deleteMany: {}, create: memberIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: tagInclude,
    })
    res.json(serializeTag(updated))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ message: 'A tag with this name already exists' })
    }
    throw e
  }
})

contactsRouter.delete('/tags/:id', async (req: AuthRequest, res) => {
  const tag = await prisma.contactTag.findUnique({ where: { id: param(req, 'id') } })
  if (!tag || tag.ownerId !== req.userId) return res.status(404).json({ message: 'Tag not found' })
  await prisma.contactTag.delete({ where: { id: tag.id } })
  res.status(204).end()
})
