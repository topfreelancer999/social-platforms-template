import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const statusRouter = Router()
statusRouter.use(requireAuth)

statusRouter.get('/', async (req: AuthRequest, res) => {
  const now = new Date()
  const statuses = await prisma.status.findMany({
    where: { expiresAt: { gt: now } },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  const byUser = new Map<string, { user: ReturnType<typeof toPublicUser>; items: typeof statuses }>()
  for (const s of statuses) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, { user: toPublicUser(s.user), items: [] })
    byUser.get(s.userId)!.items.push(s)
  }
  res.json({
    statuses: [...byUser.values()].map((g) => ({
      user: g.user,
      updates: g.items.map((s) => ({
        id: s.id,
        text: s.text,
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
      })),
    })),
  })
})

statusRouter.post('/', async (req: AuthRequest, res) => {
  const { text, imageUrl } = req.body as { text?: string; imageUrl?: string }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const status = await prisma.status.create({
    data: {
      userId: req.userId!,
      text: text?.trim() ?? '',
      imageUrl: imageUrl ?? null,
      expiresAt,
    },
    include: { user: true },
  })
  res.status(201).json({ status: { ...status, user: toPublicUser(status.user) } })
})
