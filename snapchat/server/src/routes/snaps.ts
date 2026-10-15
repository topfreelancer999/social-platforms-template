import { Router } from 'express'
import { SnapType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

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
