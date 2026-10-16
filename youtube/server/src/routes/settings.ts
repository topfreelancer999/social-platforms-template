import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { PLAYBACK_SPEEDS } from '../services/player.js'

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
      autoplay: data.autoplay,
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

const playerSchema = z
  .object({
    playbackSpeed: z
      .number()
      .refine((n) => (PLAYBACK_SPEEDS as readonly number[]).includes(n), 'Unsupported playback speed'),
    captionsLanguage: z.string().regex(/^([a-z]{2,3}(-[A-Z]{2})?)?$/, 'Invalid language'),
    theaterMode: z.boolean(),
  })
  .partial()

/** Player preferences (speed, captions language, theater mode), saved as the viewer changes them. */
settingsRouter.patch('/player', async (req: AuthRequest, res) => {
  const parsed = playerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid settings' })
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, ...parsed.data },
    update: parsed.data,
  })
  res.json({
    playbackSpeed: settings.playbackSpeed,
    captionsLanguage: settings.captionsLanguage,
    theaterMode: settings.theaterMode,
  })
})
