import { Router } from 'express'
import { DirectSnapKind, SnapType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { sendDirectSnap, type StreakView } from '../lib/streaks.js'
import { emitToUser } from '../socket/index.js'

export const snapsRouter = Router()
snapsRouter.use(requireAuth)

async function friendIds(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  })
  return rows.map((f) => (f.senderId === userId ? f.receiverId : f.senderId))
}

snapsRouter.get('/stories', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const now = new Date()
  const ids = [userId, ...(await friendIds(userId))]
  const snaps = await prisma.snap.findMany({
    where: { authorId: { in: ids }, expiresAt: { gt: now }, type: { in: [SnapType.SNAP, SnapType.STORY] } },
    include: { author: true, views: true },
    orderBy: { createdAt: 'desc' },
  })
  const byUser = new Map<string, { user: ReturnType<typeof toPublicUser>; items: typeof snaps; hasUnviewed: boolean }>()
  for (const s of snaps) {
    if (!byUser.has(s.authorId)) {
      byUser.set(s.authorId, { user: toPublicUser(s.author), items: [], hasUnviewed: false })
    }
    const g = byUser.get(s.authorId)!
    g.items.push(s)
    if (!s.views.some((v) => v.viewerId === userId)) g.hasUnviewed = true
  }
  res.json({
    stories: [...byUser.values()].map((g) => ({
      user: g.user,
      hasUnviewed: g.hasUnviewed,
      snaps: g.items.map((s) => ({
        id: s.id,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        caption: s.caption,
        createdAt: s.createdAt,
        viewCount: s.views.length,
      })),
    })),
  })
})

snapsRouter.get('/spotlight', async (req: AuthRequest, res) => {
  const now = new Date()
  const snaps = await prisma.snap.findMany({
    where: { type: SnapType.SPOTLIGHT, expiresAt: { gt: now } },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  res.json({
    items: snaps.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      videoUrl: s.videoUrl,
      caption: s.caption,
      author: toPublicUser(s.author),
    })),
  })
})

snapsRouter.post('/', async (req: AuthRequest, res) => {
  const { caption, imageUrl, videoUrl, type } = req.body as {
    caption?: string
    imageUrl: string
    videoUrl?: string
    type?: SnapType
  }
  if (!imageUrl && !videoUrl) return res.status(400).json({ message: 'imageUrl or videoUrl required' })
  const hours = type === SnapType.STORY ? 24 : 24
  const snap = await prisma.snap.create({
    data: {
      authorId: req.userId!,
      caption: caption?.trim() ?? '',
      imageUrl: imageUrl ?? `https://picsum.photos/seed/snap${Date.now()}/540/960`,
      videoUrl: videoUrl ?? null,
      type: type ?? SnapType.SNAP,
      expiresAt: new Date(Date.now() + hours * 3600000),
    },
    include: { author: true },
  })
  await prisma.user.update({
    where: { id: req.userId! },
    data: { snapScore: { increment: 5 } },
  })
  res.status(201).json({ snap: { ...snap, author: toPublicUser(snap.author) } })
})

const sendSnapSchema = z
  .object({
    recipientIds: z
      .array(z.string().min(1).max(64))
      .min(1, 'Pick at least one friend')
      .max(20, 'You can send a Snap to at most 20 friends at once'),
    kind: z.nativeEnum(DirectSnapKind),
    imageUrl: z.string().url().startsWith('https://', 'imageUrl must be https').max(500).optional(),
    text: z.string().trim().max(250, 'Text must be at most 250 characters').optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex color like #a855f7').optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === DirectSnapKind.PHOTO && !v.imageUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A photo Snap needs an imageUrl', path: ['imageUrl'] })
    }
    if (v.kind === DirectSnapKind.TEXT && !v.text) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A text Snap needs some text', path: ['text'] })
    }
  })

/** Send a private Snap to one or more friends; each recipient's streak is updated atomically. */
snapsRouter.post('/send', async (req: AuthRequest, res) => {
  const senderId = req.userId!
  const body = sendSnapSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid snap' })
  const recipientIds = [...new Set(body.data.recipientIds)]
  if (recipientIds.includes(senderId)) return res.status(400).json({ message: 'You cannot send a Snap to yourself' })
  const friends = new Set(await friendIds(senderId))
  if (recipientIds.some((id) => !friends.has(id))) {
    return res.status(403).json({ message: 'You can only send Snaps to friends' })
  }

  const { kind, imageUrl, text, color } = body.data
  const now = new Date()
  const sent = await prisma.$transaction(async (tx) => {
    const results: { recipientId: string; snapId: string; streak: StreakView | null }[] = []
    for (const recipientId of recipientIds) {
      const { snap, streak } = await sendDirectSnap(tx, senderId, recipientId, { kind, imageUrl, text, color }, now)
      results.push({ recipientId, snapId: snap.id, streak })
    }
    // Snap Score: +1 per Snap sent.
    await tx.user.update({ where: { id: senderId }, data: { snapScore: { increment: recipientIds.length } } })
    return results
  })

  for (const r of sent) {
    emitToUser(r.recipientId, 'snap:new', { snapId: r.snapId, fromUserId: senderId, kind })
    emitToUser(r.recipientId, 'streak:updated', { friendId: senderId, streak: r.streak })
    emitToUser(senderId, 'streak:updated', { friendId: r.recipientId, streak: r.streak })
  }
  res.status(201).json({ sent })
})

/** View-once: returns the content exactly once to the recipient and wipes it afterwards. */
snapsRouter.post('/direct/:id/open', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const snap = await prisma.directSnap.findUnique({ where: { id: param(req, 'id') }, include: { sender: true } })
  if (!snap) return res.status(404).json({ message: 'Snap not found' })
  if (snap.recipientId !== userId) return res.status(403).json({ message: 'This Snap was not sent to you' })
  // Conditional update so two concurrent opens cannot both read the content.
  const claimed = await prisma.directSnap.updateMany({
    where: { id: snap.id, openedAt: null },
    data: { openedAt: new Date(), imageUrl: null, text: '' },
  })
  if (claimed.count === 0) return res.status(410).json({ message: 'This Snap was already opened' })
  emitToUser(snap.senderId, 'snap:opened', { snapId: snap.id, byUserId: userId })
  res.json({
    snap: {
      id: snap.id,
      kind: snap.kind,
      imageUrl: snap.imageUrl,
      text: snap.text,
      color: snap.color,
      createdAt: snap.createdAt,
      sender: toPublicUser(snap.sender),
    },
  })
})

snapsRouter.get('/:id', async (req: AuthRequest, res) => {
  const snap = await prisma.snap.findUnique({
    where: { id: param(req, 'id') },
    include: { author: true, views: { include: { viewer: true } } },
  })
  if (!snap) return res.status(404).json({ message: 'Not found' })
  res.json({
    snap: {
      id: snap.id,
      imageUrl: snap.imageUrl,
      videoUrl: snap.videoUrl,
      caption: snap.caption,
      author: toPublicUser(snap.author),
      views: snap.views.map((v) => toPublicUser(v.viewer)),
    },
  })
})

snapsRouter.post('/:id/view', async (req: AuthRequest, res) => {
  const snapId = param(req, 'id')
  const viewerId = req.userId!
  await prisma.snapView.upsert({
    where: { snapId_viewerId: { snapId, viewerId } },
    create: { snapId, viewerId },
    update: {},
  })
  res.json({ viewed: true })
})
