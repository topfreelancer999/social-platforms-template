import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

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
  momentsVisible: z.string().max(20).optional(),
  momentsRange: z.enum(['ALL', 'SIX_MONTHS', 'ONE_MONTH', 'THREE_DAYS']).optional(),
  password: z.string().min(6).optional(),
})

settingsRouter.patch('/', async (req: AuthRequest, res) => {
  const parsed = patchSchema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  const data = parsed.data
  const settings = await prisma.userSettings.update({
    where: { userId: req.userId! },
    data: {
      emailNotifications: data.emailNotifications,
      pushNotifications: data.pushNotifications,
      profileVisibility: data.profileVisibility,
      messageRequests: data.messageRequests,
      readReceipts: data.readReceipts,
      momentsVisible: data.momentsVisible,
      momentsRange: data.momentsRange,
    },
  })
  if (data.password) {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { passwordHash: await bcrypt.hash(data.password, 10) },
    })
  }
  res.json(settings)
})
