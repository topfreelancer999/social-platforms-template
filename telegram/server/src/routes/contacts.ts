import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const contactsRouter = Router()
contactsRouter.use(requireAuth)

contactsRouter.get('/', async (req: AuthRequest, res) => {
  const rows = await prisma.contact.findMany({
    where: { userId: req.userId! },
    include: { contact: true },
  })
  res.json({
    contacts: rows.map((c) => ({
      ...toPublicUser(c.contact),
      nickname: c.nickname,
      isOnline: c.contact.isOnline,
      lastSeen: c.contact.lastSeen,
    })),
  })
})

contactsRouter.post('/:userId', async (req: AuthRequest, res) => {
  const contactUserId = param(req, 'userId')
  if (contactUserId === req.userId) return res.status(400).json({ message: 'Invalid' })
  await prisma.contact.upsert({
    where: { userId_contactUserId: { userId: req.userId!, contactUserId } },
    create: { userId: req.userId!, contactUserId },
    update: {},
  })
  res.json({ added: true })
})
