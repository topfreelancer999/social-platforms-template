import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import {
  canViewMoment,
  findVisibleMoment,
  getFriendIds,
  loadViewerContext,
  momentInclude,
  serializeMoment,
} from '../services/moments.js'

export const momentsRouter = Router()
momentsRouter.use(requireAuth)

const FEED_LIMIT = 40
/** Over-fetch before filtering so restricted posts don't starve the feed. */
const CANDIDATE_LIMIT = 200

const createSchema = z
  .object({
    content: z.string().trim().max(2000).default(''),
    imageUrl: z.string().url().max(500).nullish(),
    location: z.string().trim().max(100).default(''),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'INCLUDE', 'EXCLUDE']).default('PUBLIC'),
    tagIds: z.array(z.string().min(1)).max(50).default([]),
    userIds: z.array(z.string().min(1)).max(500).default([]),
  })
  .refine((d) => d.content.length > 0 || !!d.imageUrl, { message: 'Write something or add a photo' })
  .refine(
    (d) => !(d.visibility === 'INCLUDE' || d.visibility === 'EXCLUDE') || d.tagIds.length + d.userIds.length > 0,
    { message: 'Select at least one tag or contact' },
  )

const commentSchema = z.object({ content: z.string().trim().min(1).max(500) })

momentsRouter.get('/feed', async (req: AuthRequest, res) => {
  const ctx = await loadViewerContext(req.userId!)
  const authorIds = [ctx.viewerId, ...[...ctx.friendIds].filter((id) => !ctx.blockedBy.has(id) && !ctx.hiddenAuthors.has(id))]
  const candidates = await prisma.moment.findMany({
    where: { authorId: { in: authorIds } },
    include: momentInclude,
    orderBy: { createdAt: 'desc' },
    take: CANDIDATE_LIMIT,
  })
  const moments = candidates
    .filter((m) => canViewMoment(ctx, m, true))
    .slice(0, FEED_LIMIT)
    .map((m) => serializeMoment(ctx, m))
  res.json({ moments })
})

/** A user's Moments album, filtered for the viewer. */
momentsRouter.get('/user/:username', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { username: param(req, 'username') },
    include: { settings: true },
  })
  if (!user) return res.status(404).json({ message: 'User not found' })
  const ctx = await loadViewerContext(req.userId!)
  const isSelf = user.id === ctx.viewerId
  const isFriend = ctx.friendIds.has(user.id)
  const range = user.settings?.momentsRange ?? 'ALL'
  if (!isSelf && !isFriend) {
    return res.json({ user: toPublicUser(user), isSelf, isFriend, range: null, moments: [] })
  }
  const all = await prisma.moment.findMany({
    where: { authorId: user.id },
    include: momentInclude,
    orderBy: { createdAt: 'desc' },
    take: CANDIDATE_LIMIT,
  })
  res.json({
    user: toPublicUser(user),
    isSelf,
    isFriend,
    range: isSelf ? range : ctx.blockedBy.has(user.id) ? null : range,
    moments: all.filter((m) => canViewMoment(ctx, m)).map((m) => serializeMoment(ctx, m)),
  })
})

momentsRouter.get('/:id', async (req: AuthRequest, res) => {
  const found = await findVisibleMoment(req.userId!, param(req, 'id'))
  if (!found) return res.status(404).json({ message: 'Moment not found' })
  res.json(serializeMoment(found.ctx, found.moment))
})

momentsRouter.post('/', async (req: AuthRequest, res) => {
  const body = createSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const authorId = req.userId!
  const { visibility } = body.data
  const restricted = visibility === 'INCLUDE' || visibility === 'EXCLUDE'
  const tagIds = restricted ? [...new Set(body.data.tagIds)] : []
  const userIds = restricted ? [...new Set(body.data.userIds)] : []

  if (tagIds.length) {
    const owned = await prisma.contactTag.count({ where: { id: { in: tagIds }, ownerId: authorId } })
    if (owned !== tagIds.length) return res.status(400).json({ message: 'Unknown tag' })
  }
  if (userIds.length) {
    const friends = await getFriendIds(authorId)
    if (!userIds.every((id) => friends.has(id))) return res.status(400).json({ message: 'You can only select your contacts' })
  }

  const moment = await prisma.moment.create({
    data: {
      authorId,
      content: body.data.content,
      imageUrl: body.data.imageUrl ?? null,
      location: body.data.location,
      visibility,
      audience: {
        create: [...tagIds.map((tagId) => ({ tagId })), ...userIds.map((userId) => ({ userId }))],
      },
    },
  })
  const found = await findVisibleMoment(authorId, moment.id)
  res.status(201).json(serializeMoment(found!.ctx, found!.moment))
})

momentsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const moment = await prisma.moment.findUnique({ where: { id: param(req, 'id') } })
  if (!moment) return res.status(404).json({ message: 'Moment not found' })
  if (moment.authorId !== req.userId) return res.status(403).json({ message: 'Forbidden' })
  await prisma.moment.delete({ where: { id: moment.id } })
  res.status(204).end()
})

momentsRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const momentId = param(req, 'id')
  const userId = req.userId!
  if (!(await findVisibleMoment(userId, momentId))) return res.status(404).json({ message: 'Moment not found' })
  const existing = await prisma.momentLike.findUnique({
    where: { momentId_userId: { momentId, userId } },
  })
  if (existing) await prisma.momentLike.delete({ where: { id: existing.id } })
  else await prisma.momentLike.create({ data: { momentId, userId } })
  const found = await findVisibleMoment(userId, momentId)
  res.json(serializeMoment(found!.ctx, found!.moment))
})

momentsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const momentId = param(req, 'id')
  const userId = req.userId!
  const body = commentSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: 'Comment cannot be empty' })
  if (!(await findVisibleMoment(userId, momentId))) return res.status(404).json({ message: 'Moment not found' })
  await prisma.momentComment.create({
    data: { momentId, authorId: userId, content: body.data.content },
  })
  const found = await findVisibleMoment(userId, momentId)
  res.json(serializeMoment(found!.ctx, found!.moment))
})
