import { Router } from 'express'
import bcrypt from 'bcryptjs'
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

settingsRouter.patch('/', async (req: AuthRequest, res) => {
  const data = req.body
  const settings = await prisma.userSettings.update({
    where: { userId: req.userId! },
    data: {
      emailNotifications: data.emailNotifications,
      pushNotifications: data.pushNotifications,
      profileVisibility: data.profileVisibility,
      messageRequests: data.messageRequests,
      compactMode: data.compactMode,
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
