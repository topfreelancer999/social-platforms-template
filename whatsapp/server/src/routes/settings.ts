import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { emitToUser } from '../lib/io.js'
import { chatPeers } from '../services/messages.js'

export const settingsRouter = Router()
settingsRouter.use(requireAuth)

settingsRouter.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { settings: true },
  })
  res.json({ settings: user?.settings, email: user?.email })
})

const patchSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  profileVisibility: z.string().max(20).optional(),
  messageRequests: z.string().max(20).optional(),
  readReceipts: z.boolean().optional(),
  lastSeenVisible: z.boolean().optional(),
  password: z.string().min(6).max(128).optional(),
})

settingsRouter.patch('/', async (req: AuthRequest, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request' })
  const data = parsed.data
  const settings = await prisma.userSettings.update({
    where: { userId: req.userId! },
    data: {
      emailNotifications: data.emailNotifications,
      pushNotifications: data.pushNotifications,
      profileVisibility: data.profileVisibility,
      messageRequests: data.messageRequests,
      readReceipts: data.readReceipts,
      lastSeenVisible: data.lastSeenVisible,
    },
  })
  if (data.password) {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { passwordHash: await bcrypt.hash(data.password, 10) },
    })
  }
  // Ticks and "online / last seen" depend on these; let chat partners refresh.
  if (data.readReceipts !== undefined || data.lastSeenVisible !== undefined) {
    for (const peer of await chatPeers(req.userId!)) emitToUser(peer, 'presence:update', { userId: req.userId })
  }
  res.json(settings)
})
