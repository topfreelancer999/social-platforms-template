import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const storiesRouter = Router()
storiesRouter.use(requireAuth)

storiesRouter.get('/', async (req: AuthRequest, res) => {
  const now = new Date()
  const following = await prisma.follow.findMany({
    where: { followerId: req.userId! },
    select: { followingId: true },
  })
  const ids = [req.userId!, ...following.map((f) => f.followingId)]
  const stories = await prisma.story.findMany({
    where: { userId: { in: ids }, expiresAt: { gt: now } },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  const byUser = new Map<string, { user: ReturnType<typeof toPublicUser>; items: { id: string; imageUrl: string; createdAt: Date }[] }>()
  for (const s of stories) {
    const key = s.userId
    if (!byUser.has(key)) {
      byUser.set(key, { user: toPublicUser(s.user), items: [] })
    }
    byUser.get(key)!.items.push({ id: s.id, imageUrl: s.imageUrl, createdAt: s.createdAt })
  }
  res.json({ stories: [...byUser.values()] })
})

storiesRouter.post('/', async (req: AuthRequest, res) => {
  const { imageUrl } = req.body as { imageUrl: string }
  if (!imageUrl) return res.status(400).json({ message: 'imageUrl required' })
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const story = await prisma.story.create({
    data: { userId: req.userId!, imageUrl, expiresAt },
    include: { user: true },
  })
  res.status(201).json({ story: { ...story, user: toPublicUser(story.user) } })
})
