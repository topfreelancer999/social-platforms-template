import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { zodMessage } from '../lib/validation.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { pendingRequestCount, setAccountPrivacy } from '../services/follows.js'

export const settingsRouter = Router()
settingsRouter.use(requireAuth)

settingsRouter.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { settings: true },
  })
  res.json({
    settings: user?.settings,
    email: user?.email,
    isPrivate: user?.isPrivate ?? false,
    pendingRequests: await pendingRequestCount(req.userId!),
  })
})

const privacySchema = z.object({ isPrivate: z.boolean() })

/** Settings → Account privacy. Switching to public auto-approves pending follow requests. */
settingsRouter.patch('/privacy', async (req: AuthRequest, res) => {
  const body = privacySchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const { user, autoAccepted } = await setAccountPrivacy(req.userId!, body.data.isPrivate)
  res.json({ user: toPublicUser(user), isPrivate: user.isPrivate, autoAccepted })
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
      showActivityStatus: data.showActivityStatus,
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
